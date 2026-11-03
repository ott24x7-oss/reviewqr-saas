/**
 * Baileys (unofficial WhatsApp Web) integration.
 *
 * Runs as an in-process singleton on the Railway container so the socket
 * stays alive across HTTP requests. Auth state (creds + signal keys) is
 * persisted in the AppSetting table so Baileys survives a redeploy
 * without re-pairing.
 *
 * Caveats baked in:
 *  - A database owner lease coordinates overlapping Railway instances
 *  - Baileys is loaded with dynamic import so a missing/broken native dep
 *    doesn't crash the rest of the app — it just reports "unavailable"
 *  - QR is exposed as a base64 PNG that the admin polls every ~3s
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import * as QR from "qrcode";
import {
  BoundedMapCache,
  CoalescedWriter,
  isOwnerLease,
  OwnerLease,
  RetryMessageCache,
  shouldTakeOwnerLease
} from "./whatsapp-baileys-state";

type Status =
  | "idle"
  | "starting"
  | "qr-pending"
  | "connecting"
  | "connected"
  | "disconnected"
  | "logged-out"
  | "unavailable";

const AUTH_KEY = "whatsapp.baileys.auth";
// Set when an admin presses Disconnect, so a restart doesn't reconnect against their wish.
const PAUSED_KEY = "whatsapp.baileys.paused";
const OWNER_KEY = "whatsapp.baileys.owner";
const WATCHDOG_MS = 60_000;
// Give the new deployment time to take ownership before retrying a replaced socket.
const REPLACED_BACKOFF_MS = 30_000;
const OWNER_TAKEN_ERROR = "Another server instance took over";
const INSTANCE_STARTED_AT = Date.now();
const INSTANCE_ID = process.env.RAILWAY_DEPLOYMENT_ID
  ? `${process.env.RAILWAY_DEPLOYMENT_ID}:${randomUUID()}`
  : randomUUID();

class BaileysManager {
  private socket: any = null;
  private readonly ownerLease: OwnerLease = {
    instanceId: INSTANCE_ID,
    startedAt: INSTANCE_STARTED_AT
  };
  private _lease: OwnerLease | null = null;
  private _leaseLost = false;
  private _startAttempt = 0;
  private _socketGeneration = 0;
  private _writer: CoalescedWriter | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly sentMessages = new RetryMessageCache<any>(500, 24 * 60 * 60 * 1000);
  private _status: Status = "idle";
  private _qrText: string | null = null;
  private _qrPng: string | null = null;
  private _phoneNumber: string | null = null;
  private _error: string | null = null;
  private _connectedAt: Date | null = null;
  private _lastEvent: string | null = null;
  private _manualStop = false;
  private _downTimer: ReturnType<typeof setTimeout> | null = null;
  private _watchdog: ReturnType<typeof setInterval> | null = null;

  getInfo() {
    return {
      status: this._status,
      qrPng: this._qrPng,
      phoneNumber: this._phoneNumber,
      error: this._error,
      connectedAt: this._connectedAt?.toISOString() || null,
      lastEvent: this._lastEvent
    };
  }

  isConnected() {
    return this._status === "connected" && !!this.socket;
  }

  /**
   * Reconnects with the saved login after a restart or deploy, and keeps checking every minute.
   * Does nothing without saved creds (pair once from Admin → WhatsApp) or after a manual Disconnect.
   */
  autoStart() {
    if (!this._watchdog) {
      this._watchdog = setInterval(() => {
        this.resumeIfPaired().catch(() => {});
      }, WATCHDOG_MS);
      this._watchdog.unref?.();
    }
    return this.resumeIfPaired();
  }

  private async resumeIfPaired() {
    if (this.isConnected() || this._manualStop || this._leaseLost) return false;
    if (["starting", "connecting", "qr-pending", "unavailable"].includes(this._status)) return false;
    if (await isPaused()) return false;
    if (!(await loadAuthBlob())) return false;
    await this.start({ auto: true });
    return true;
  }

  private isStartActive(attempt: number) {
    return attempt === this._startAttempt && !this._manualStop && !this._leaseLost;
  }

  /** OTP and alert path: reconnect if needed and wait briefly so the message can still go out. */
  async ensureConnected(waitMs = 8_000) {
    if (this.isConnected()) return true;
    await this.resumeIfPaired().catch(() => false);
    const until = Date.now() + waitMs;
    while (Date.now() < until) {
      if (this.isConnected()) return true;
      if (!["starting", "connecting"].includes(this._status)) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return this.isConnected();
  }

  async start(opts: { auto?: boolean } = {}): Promise<void> {
    if (this._leaseLost) return;
    if (this._status === "starting" || this._status === "connecting") return;
    if (this._status === "connected") return;
    const startAttempt = ++this._startAttempt;

    this._status = "starting";
    this._manualStop = false;
    this._error = null;
    this._lastEvent = "starting";
    if (!opts.auto) await setPaused(false);
    if (!this.isStartActive(startAttempt)) return;

    this._lease = this.ownerLease;
    try {
      if (!(await claimOwnerLease(this.ownerLease))) {
        if (!this.isStartActive(startAttempt)) return;
        await this.relinquishOwnership();
        return;
      }
    } catch (e: any) {
      if (!this.isStartActive(startAttempt)) return;
      this._status = "disconnected";
      this._error = "Unable to claim WhatsApp session owner lease";
      console.error("[baileys] owner lease claim failed:", e?.message || e);
      return;
    }
    if (!this.isStartActive(startAttempt)) return;

    let baileys: any;
    try {
      baileys = await import("@whiskeysockets/baileys");
    } catch (e: any) {
      if (!this.isStartActive(startAttempt)) return;
      this._status = "unavailable";
      this._error =
        "Baileys package failed to load. Make sure @whiskeysockets/baileys is installed.";
      console.error("[baileys] import failed:", e?.message || e);
      return;
    }
    if (!this.isStartActive(startAttempt)) return;

    const {
      default: makeWASocket,
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      initAuthCreds,
      BufferJSON,
      proto
    } = baileys as any;

    let pino: any;
    try {
      pino = (await import("pino")).default;
    } catch {
      pino = () => ({
        info() {},
        error() {},
        warn() {},
        debug() {},
        trace() {},
        child() {
          return this;
        }
      });
    }
    if (!this.isStartActive(startAttempt)) return;

    // ---- DB-backed auth state ----
    const authBlob = await loadAuthBlob();
    if (!this.isStartActive(startAttempt)) return;
    const creds = authBlob?.creds
      ? JSON.parse(JSON.stringify(authBlob.creds), BufferJSON.reviver)
      : initAuthCreds();
    const keyStore = new Map<string, any>(
      authBlob?.keys
        ? Object.entries(
            JSON.parse(JSON.stringify(authBlob.keys), BufferJSON.reviver) as Record<string, any>
          )
        : []
    );
    let persist = async () => {};
    const signalKeyStore = {
      get: async (type: string, ids: string[]) => {
        const data: Record<string, any> = {};
        for (const id of ids) {
          const value = keyStore.get(`${type}-${id}`);
          if (value) {
            data[id] =
              type === "app-state-sync-key" && value
                ? proto.Message.AppStateSyncKeyData.fromObject(value)
                : value;
          }
        }
        return data;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            const k = `${category}-${id}`;
            if (value) keyStore.set(k, value);
            else keyStore.delete(k);
          }
        }
        await persist();
      }
    };

    const state = {
      creds,
      keys: makeCacheableSignalKeyStore(signalKeyStore, pino({ level: "silent" }))
    };

    let version: any;
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
    } catch {
      version = undefined;
    }
    if (!this.isStartActive(startAttempt)) return;

    const generation = ++this._socketGeneration;
    const retryCounterCache = new BoundedMapCache(500, 60 * 60 * 1000);
    const writer = new CoalescedWriter(
      async () => {
        if (generation !== this._socketGeneration || this._leaseLost) return;
        const lease = this._lease;
        if (!lease) return;
        const current = await loadOwnerLease();
        if (!isOwnerLease(current, lease)) {
          await this.relinquishOwnership();
          return;
        }

        const keysObj: Record<string, any> = {};
        for (const [k, v] of keyStore.entries()) keysObj[k] = v;
        const snapshot = {
          creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
          keys: JSON.parse(JSON.stringify(keysObj, BufferJSON.replacer))
        };
        if (!(await saveAuthBlobIfOwner(snapshot, lease))) {
          await this.relinquishOwnership();
        }
      },
      (e) => console.error("[baileys] auth persist failed:", (e as any)?.message || e)
    );
    this._writer = writer;
    persist = () => writer.request();

    let socket: any;
    try {
      socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["QR24x7", "Chrome", "1.0"],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        getMessage: async (key: any) => (key?.id ? this.sentMessages.get(key.id) : undefined),
        msgRetryCounterCache: retryCounterCache
      });
    } catch (e: any) {
      this._status = "disconnected";
      this._error = e?.message || "Failed to create socket";
      console.error("[baileys] makeWASocket failed:", e);
      return;
    }
    this.socket = socket;

    this._status = "connecting";
    this._lastEvent = "connecting";

    socket.ev.on("creds.update", () => {
      if (generation === this._socketGeneration && this.socket === socket) void writer.request();
    });

    socket.ev.on("connection.update", (update: any) => {
      if (generation !== this._socketGeneration || this.socket !== socket || this._leaseLost) return;
      const { connection, lastDisconnect, qr } = update;
      this._lastEvent = `connection.update:${connection || "?"}`;
      if (qr) {
        this._qrText = qr;
        this._status = "qr-pending";
        QR.toDataURL(qr, { margin: 1, scale: 6 })
          .then((d) => {
            if (generation === this._socketGeneration && !this._leaseLost) this._qrPng = d;
          })
          .catch(() => {});
      }
      if (connection === "open") {
        this._status = "connected";
        this._connectedAt = new Date();
        this._qrText = null;
        this._qrPng = null;
        this._phoneNumber = socket?.user?.id?.split(":")[0]?.split("@")[0] || null;
      } else if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const wasConnected = !!this._connectedAt;
        this.socket = null;
        this._connectedAt = null;
        this._phoneNumber = null;
        const reason = code === DisconnectReason.loggedOut ? "logged-out" : "disconnected";
        if (code === DisconnectReason.loggedOut) {
          this._status = "logged-out";
          void this.finishLoggedOutSocket(socket, generation, writer);
        } else {
          this._status = "disconnected";
          const wait = code === DisconnectReason.connectionReplaced ? REPLACED_BACKOFF_MS : 5000;
          if (code === DisconnectReason.connectionReplaced) {
            void this.handleConnectionReplaced(socket, generation, writer, wait);
          } else {
            void this.finishClosedSocket(generation, writer, wait);
          }
        }
        if (!this._manualStop) {
          if (reason === "logged-out") this.alertDown(reason);
          else if (wasConnected && !this._downTimer) {
            // Transient drops reconnect in seconds. Alert only if still down after a minute.
            this._downTimer = setTimeout(() => {
              this._downTimer = null;
              if (!this.isConnected() && !this._manualStop) this.alertDown(reason);
            }, 60_000);
          }
        }
      }
    });
  }

  private async finishClosedSocket(
    generation: number,
    writer: CoalescedWriter,
    reconnectAfterMs: number
  ) {
    await writer.flush();
    if (generation !== this._socketGeneration) return;
    this._socketGeneration += 1;
    if (!this._manualStop && !this._leaseLost) this.scheduleReconnect(reconnectAfterMs);
  }

  private async handleConnectionReplaced(
    socket: any,
    generation: number,
    writer: CoalescedWriter,
    reconnectAfterMs: number
  ) {
    try {
      const current = await loadOwnerLease();
      if (current && this._lease && !isOwnerLease(current, this._lease)) {
        await this.relinquishOwnership(socket);
        return;
      }
    } catch (e: any) {
      console.error("[baileys] owner lease check failed:", e?.message || e);
    }

    await writer.flush();
    if (generation !== this._socketGeneration) return;
    this._socketGeneration += 1;
    if (!this._manualStop && !this._leaseLost) this.scheduleReconnect(reconnectAfterMs);
  }

  private async finishLoggedOutSocket(
    socket: any,
    generation: number,
    writer: CoalescedWriter
  ) {
    await writer.flush();
    if (generation !== this._socketGeneration) return;
    this._socketGeneration += 1;
    const lease = this._lease;
    if (!lease) return;
    try {
      if (!(await clearAuthBlobIfOwner(lease))) {
        const current = await loadOwnerLease();
        if (!isOwnerLease(current, lease)) await this.relinquishOwnership(socket);
      }
    } catch (e: any) {
      console.error("[baileys] logout auth cleanup failed:", e?.message || e);
    }
  }

  private scheduleReconnect(waitMs: number) {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      if (this._status !== "disconnected" || this._manualStop || this._leaseLost) return;
      await this._writer?.flush();
      if (this._status === "disconnected" && !this._manualStop && !this._leaseLost) {
        this.start({ auto: true }).catch(() => {});
      }
    }, waitMs);
  }

  private async relinquishOwnership(socket?: any) {
    if (!this._leaseLost) {
      this._leaseLost = true;
      this._error = OWNER_TAKEN_ERROR;
      this._lastEvent = "owner lease lost";
    }
    this._status = "disconnected";
    this._connectedAt = null;
    this._phoneNumber = null;
    this._qrText = null;
    this._qrPng = null;
    if (this._downTimer) clearTimeout(this._downTimer);
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._downTimer = null;
    this._reconnectTimer = null;
    const activeSocket = this.socket;
    this.socket = null;
    this._socketGeneration += 1;
    try {
      (socket || activeSocket)?.end?.(undefined);
    } catch (e: any) {
      console.warn("[baileys] stopped after owner takeover:", e?.message);
    }
  }

  private cacheSentMessage(message: any) {
    const id = message?.key?.id;
    if (typeof id === "string" && message?.message) {
      this.sentMessages.set(id, message.message);
    }
  }

  private alertDown(reason: string) {
    import("./baileys-alert")
      .then((mod) => mod.noteBaileysDown(reason))
      .catch(() => {});
  }

  async stop(opts: { logout?: boolean } = {}): Promise<void> {
    this._startAttempt += 1;
    this._manualStop = true;
    await setPaused(true);
    if (this._downTimer) {
      clearTimeout(this._downTimer);
      this._downTimer = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    const socket = this.socket;
    if (socket) {
      try {
        if (opts.logout) {
          await socket.logout();
        } else {
          socket.end?.(undefined);
        }
      } catch (e: any) {
        console.warn("[baileys] stop:", e?.message);
      }
    }
    this.socket = null;
    await this._writer?.flush();
    this._socketGeneration += 1;
    if (!this._leaseLost) this._status = opts.logout ? "logged-out" : "disconnected";
    this._qrText = null;
    this._qrPng = null;
    this._phoneNumber = null;
    this._connectedAt = null;
    if (opts.logout && this._lease) {
      try {
        if (!(await clearAuthBlobIfOwner(this._lease))) {
          const current = await loadOwnerLease();
          if (!isOwnerLease(current, this._lease)) await this.relinquishOwnership(socket);
        }
      } catch (e: any) {
        console.error("[baileys] logout auth cleanup failed:", e?.message || e);
      }
    }
  }

  async send(to: string, text: string) {
    if (!this.isConnected()) throw new Error("Baileys not connected");
    const jid = toJid(to);
    const socket = this.socket;
    const sent = await socket.sendMessage(jid, { text });
    this.cacheSentMessage(sent);
    return sent;
  }

  /** OTP path. Rejects after 10s so the caller can try the next channel. */
  async sendText(toE164: string, message: string) {
    if (!this.isConnected()) throw new Error("Baileys not connected");
    const jid = toJid(toE164);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Baileys send timed out")), 10_000);
    });
    try {
      const socket = this.socket;
      const sendPromise = socket.sendMessage(jid, { text: message }).then((sent: any) => {
        this.cacheSentMessage(sent);
        return sent;
      });
      return await Promise.race([sendPromise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function toJid(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Indian default — 10 digits → prepend 91
  const normalized = digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : digits;
  return `${normalized}@s.whatsapp.net`;
}

async function loadAuthBlob(): Promise<{ creds: any; keys: any } | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: AUTH_KEY } });
    if (!row?.value) return null;
    return JSON.parse(row.value);
  } catch (e) {
    return null;
  }
}

async function loadOwnerLease(): Promise<OwnerLease | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: OWNER_KEY } });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value);
    if (typeof parsed?.instanceId !== "string" || typeof parsed?.startedAt !== "number") return null;
    return { instanceId: parsed.instanceId, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

async function claimOwnerLease(lease: OwnerLease): Promise<boolean> {
  const current = await loadOwnerLease();
  if (!shouldTakeOwnerLease(current, lease)) return isOwnerLease(current, lease);

  const value = JSON.stringify(lease);
  const changed = await prisma.$executeRaw`
    INSERT INTO "AppSetting" ("key", "value", "updatedAt")
    VALUES (${OWNER_KEY}, ${value}, NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value", "updatedAt" = NOW()
      WHERE COALESCE(
        substring("AppSetting"."value" FROM '"startedAt"[[:space:]]*:[[:space:]]*([0-9]+)')::bigint,
        -1
      ) < ${lease.startedAt}
      OR "AppSetting"."value" = ${value}
  `;
  if (changed > 0) return true;
  return isOwnerLease(await loadOwnerLease(), lease);
}

async function saveAuthBlobIfOwner(blob: { creds: any; keys: any }, lease: OwnerLease) {
  const value = JSON.stringify(blob);
  const ownerValue = JSON.stringify(lease);
  const changed = await prisma.$executeRaw`
    WITH owner AS MATERIALIZED (
      SELECT "key"
      FROM "AppSetting"
      WHERE "key" = ${OWNER_KEY} AND "value" = ${ownerValue}
      FOR UPDATE
    )
    INSERT INTO "AppSetting" ("key", "value", "updatedAt")
    SELECT ${AUTH_KEY}, ${value}, NOW() FROM owner
    ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value", "updatedAt" = NOW()
      WHERE EXISTS (SELECT 1 FROM owner)
  `;
  return changed > 0;
}

async function isPaused() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: PAUSED_KEY } });
    return row?.value === "1";
  } catch {
    return false;
  }
}

async function setPaused(paused: boolean) {
  if (paused) {
    await prisma.appSetting
      .upsert({ where: { key: PAUSED_KEY }, create: { key: PAUSED_KEY, value: "1" }, update: { value: "1" } })
      .catch(() => {});
  } else {
    await prisma.appSetting.deleteMany({ where: { key: PAUSED_KEY } }).catch(() => {});
  }
}

async function clearAuthBlobIfOwner(lease: OwnerLease) {
  const ownerValue = JSON.stringify(lease);
  await prisma.$executeRaw`
    WITH owner AS MATERIALIZED (
      SELECT "key"
      FROM "AppSetting"
      WHERE "key" = ${OWNER_KEY} AND "value" = ${ownerValue}
      FOR UPDATE
    )
    DELETE FROM "AppSetting" AS auth
    USING owner
    WHERE auth."key" = ${AUTH_KEY}
  `;
  return isOwnerLease(await loadOwnerLease(), lease);
}

const g = globalThis as any;
export function getBaileys(): BaileysManager {
  if (!g.__reviewqr_baileys) {
    g.__reviewqr_baileys = new BaileysManager();
  }
  return g.__reviewqr_baileys as BaileysManager;
}

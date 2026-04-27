/**
 * Baileys (unofficial WhatsApp Web) integration.
 *
 * Runs as an in-process singleton on the Railway container so the socket
 * stays alive across HTTP requests. Auth state (creds + signal keys) is
 * persisted in the AppSetting table so Baileys survives a redeploy
 * without re-pairing.
 *
 * Caveats baked in:
 *  - Single replica only (the singleton is not coordinated across pods)
 *  - Baileys is loaded with dynamic import so a missing/broken native dep
 *    doesn't crash the rest of the app — it just reports "unavailable"
 *  - QR is exposed as a base64 PNG that the admin polls every ~3s
 */
import "server-only";
import { prisma } from "./db";
import * as QR from "qrcode";

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

class BaileysManager {
  private socket: any = null;
  private _status: Status = "idle";
  private _qrText: string | null = null;
  private _qrPng: string | null = null;
  private _phoneNumber: string | null = null;
  private _error: string | null = null;
  private _connectedAt: Date | null = null;
  private _lastEvent: string | null = null;

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

  async start(): Promise<void> {
    if (this._status === "starting" || this._status === "connecting") return;
    if (this._status === "connected") return;

    this._status = "starting";
    this._error = null;
    this._lastEvent = "starting";

    let baileys: any;
    try {
      baileys = await import("@whiskeysockets/baileys");
    } catch (e: any) {
      this._status = "unavailable";
      this._error =
        "Baileys package failed to load. Make sure @whiskeysockets/baileys is installed.";
      console.error("[baileys] import failed:", e?.message || e);
      return;
    }

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

    // ---- DB-backed auth state ----
    const authBlob = await loadAuthBlob();
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

    const persist = async () => {
      const keysObj: Record<string, any> = {};
      for (const [k, v] of keyStore.entries()) keysObj[k] = v;
      await saveAuthBlob({
        creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
        keys: JSON.parse(JSON.stringify(keysObj, BufferJSON.replacer))
      });
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

    try {
      this.socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["ReviewQR", "Chrome", "1.0"],
        markOnlineOnConnect: false,
        syncFullHistory: false
      });
    } catch (e: any) {
      this._status = "disconnected";
      this._error = e?.message || "Failed to create socket";
      console.error("[baileys] makeWASocket failed:", e);
      return;
    }

    this._status = "connecting";
    this._lastEvent = "connecting";

    this.socket.ev.on("creds.update", async () => {
      try {
        await persist();
      } catch (e: any) {
        console.error("[baileys] creds persist failed:", e?.message);
      }
    });

    this.socket.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      this._lastEvent = `connection.update:${connection || "?"}`;
      if (qr) {
        this._qrText = qr;
        this._status = "qr-pending";
        QR.toDataURL(qr, { margin: 1, scale: 6 })
          .then((d) => {
            this._qrPng = d;
          })
          .catch(() => {});
      }
      if (connection === "open") {
        this._status = "connected";
        this._connectedAt = new Date();
        this._qrText = null;
        this._qrPng = null;
        this._phoneNumber = this.socket?.user?.id?.split(":")[0]?.split("@")[0] || null;
      } else if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        this._connectedAt = null;
        this._phoneNumber = null;
        if (code === DisconnectReason.loggedOut) {
          this._status = "logged-out";
          // Clear stored creds so a fresh QR appears next time.
          clearAuthBlob().catch(() => {});
        } else {
          this._status = "disconnected";
          // Auto-reconnect for transient drops
          setTimeout(() => {
            if (this._status === "disconnected") this.start().catch(() => {});
          }, 5000);
        }
      }
    });
  }

  async stop(opts: { logout?: boolean } = {}): Promise<void> {
    if (!this.socket) {
      this._status = "disconnected";
      return;
    }
    try {
      if (opts.logout) {
        await this.socket.logout();
      } else {
        this.socket.end?.(undefined);
      }
    } catch (e: any) {
      console.warn("[baileys] stop:", e?.message);
    }
    this.socket = null;
    this._status = opts.logout ? "logged-out" : "disconnected";
    this._qrText = null;
    this._qrPng = null;
    this._phoneNumber = null;
    this._connectedAt = null;
    if (opts.logout) await clearAuthBlob().catch(() => {});
  }

  async send(to: string, text: string) {
    if (!this.isConnected()) throw new Error("Baileys not connected");
    const jid = toJid(to);
    return this.socket.sendMessage(jid, { text });
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

async function saveAuthBlob(blob: { creds: any; keys: any }) {
  const value = JSON.stringify(blob);
  await prisma.appSetting.upsert({
    where: { key: AUTH_KEY },
    create: { key: AUTH_KEY, value },
    update: { value }
  });
}

async function clearAuthBlob() {
  await prisma.appSetting.deleteMany({ where: { key: AUTH_KEY } }).catch(() => {});
}

const g = globalThis as any;
export function getBaileys(): BaileysManager {
  if (!g.__reviewqr_baileys) {
    g.__reviewqr_baileys = new BaileysManager();
  }
  return g.__reviewqr_baileys as BaileysManager;
}

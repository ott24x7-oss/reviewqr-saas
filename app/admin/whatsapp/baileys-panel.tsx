"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Power, RefreshCw, Smartphone, Link2Off, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status =
  | "idle"
  | "starting"
  | "qr-pending"
  | "connecting"
  | "connected"
  | "disconnected"
  | "logged-out"
  | "unavailable";

type Info = {
  status: Status;
  qrPng: string | null;
  phoneNumber: string | null;
  error: string | null;
  connectedAt: string | null;
  lastEvent: string | null;
};

const POLL_MS = 2500;

export function BaileysPanel() {
  const [info, setInfo] = React.useState<Info | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/baileys/status", { cache: "no-store" });
      if (res.ok) setInfo(await res.json());
    } catch {}
  }, []);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/whatsapp/baileys/connect", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setInfo(j.info);
      toast.success("Connecting…");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(logout: boolean) {
    if (logout && !confirm("Log out and forget the paired phone? You'll need to scan again."))
      return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/whatsapp/baileys/disconnect${logout ? "?logout=1" : ""}`,
        { method: "POST" }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setInfo(j.info);
      toast.success(logout ? "Logged out" : "Disconnected");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const status = info?.status ?? "idle";
  const tone = statusTone(status);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Baileys (WhatsApp Web)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pair the linked phone once. Server stays signed in across deploys via DB-backed creds.
          </p>
        </div>
        <Badge variant={tone.variant as any}>{statusLabel(status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {info?.error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/15 p-3 text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{info.error}</div>
          </div>
        )}

        {status === "qr-pending" && info?.qrPng && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-xl bg-white p-3 shadow-neu">
              <img src={info.qrPng} alt="WhatsApp pairing QR" className="h-56 w-56" />
            </div>
            <p className="text-sm text-center max-w-sm text-muted-foreground">
              Open WhatsApp on your phone → <b>Settings → Linked devices → Link a device</b> →
              scan this code. Refreshes automatically every few seconds.
            </p>
          </div>
        )}

        {status === "connected" && (
          <div className="rounded-xl border bg-accent/15 border-accent/20 p-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-accent text-white inline-flex items-center justify-center">
              <Smartphone className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-semibold text-accent">
                Connected as {info?.phoneNumber || "—"}
              </div>
              <div className="text-xs text-accent/80">
                {info?.connectedAt
                  ? `Since ${new Date(info.connectedAt).toLocaleString()}`
                  : ""}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {status === "connected" || status === "connecting" || status === "qr-pending" ? (
            <>
              <Button
                onClick={() => disconnect(false)}
                disabled={busy}
                variant="outline"
                size="sm"
              >
                <Power className="h-3.5 w-3.5" /> Disconnect
              </Button>
              <Button
                onClick={() => disconnect(true)}
                disabled={busy}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Link2Off className="h-3.5 w-3.5" /> Logout & forget
              </Button>
            </>
          ) : (
            <Button onClick={connect} disabled={busy} variant="gradient" size="sm">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
              {status === "logged-out" || status === "disconnected"
                ? "Reconnect"
                : "Start & show QR"}
            </Button>
          )}
          <Button onClick={refresh} disabled={busy} variant="ghost" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Tip: Use a dedicated WhatsApp number for this — keep volumes modest (notifications &
          alerts, not bulk marketing) to avoid bans. Only one Railway replica can host the
          connection.
        </p>
      </CardContent>
    </Card>
  );
}

function statusLabel(s: Status) {
  return {
    idle: "Idle",
    starting: "Starting",
    "qr-pending": "Scan QR",
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
    "logged-out": "Logged out",
    unavailable: "Unavailable"
  }[s];
}

function statusTone(s: Status) {
  if (s === "connected") return { variant: "success" };
  if (s === "qr-pending" || s === "starting" || s === "connecting") return { variant: "warning" };
  if (s === "unavailable") return { variant: "destructive" };
  return { variant: "outline" };
}

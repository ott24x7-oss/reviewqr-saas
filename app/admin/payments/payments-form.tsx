"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Save,
  Plug,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Coins,
  Mail
} from "lucide-react";
import type { PaymentsConfig } from "@/lib/settings";
import { cn } from "@/lib/utils";

const USDT_NETWORKS = ["TRC20", "BEP20", "ERC20", "Polygon"];

export function PaymentsConfigForm({ initial }: { initial: PaymentsConfig }) {
  const [cfg, setCfg] = React.useState<PaymentsConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [keyTouched, setKeyTouched] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(
    null
  );

  function update<K extends keyof PaymentsConfig>(k: K, v: PaymentsConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...cfg };
      // Only send the IMAP app-password when the admin typed a new one — the field
      // otherwise shows a masked placeholder and the server keeps the stored value.
      if (!keyTouched) delete body.mailImapPass;
      const res = await fetch("/api/admin/settings/payments", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Payment settings saved");
      setKeyTouched(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function testEmail() {
    setTesting(true);
    setTestResult(null);
    try {
      const body: any = {
        mailImapHost: cfg.mailImapHost,
        mailImapPort: cfg.mailImapPort,
        mailImapUser: cfg.mailImapUser
      };
      if (keyTouched) body.mailImapPass = cfg.mailImapPass;
      const res = await fetch("/api/admin/settings/payments/test-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.message || j.error || "Connection failed");
      setTestResult({ ok: true, message: j.message || "Connected to mailbox." });
      toast.success("IMAP connection works");
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm text-muted-foreground">
        Customers pay by UPI or USDT directly to the details you set below. When your bank or
        exchange emails the confirmation, ReviewQR matches the exact amount and activates their
        plan automatically.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            UPI (INR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.upiEnabled}
              onChange={(e) => update("upiEnabled", e.target.checked)}
            />
            <span className="font-medium">Accept UPI payments</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">UPI ID / VPA</Label>
              <Input
                value={cfg.upiId}
                onChange={(e) => update("upiId", e.target.value)}
                placeholder="name@okhdfc"
              />
            </div>
            <div>
              <Label className="text-xs">Payee name</Label>
              <Input
                value={cfg.upiPayeeName}
                onChange={(e) => update("upiPayeeName", e.target.value)}
                placeholder="ReviewQR"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">UPI QR image URL</Label>
            <Input
              value={cfg.upiQrDataUrl}
              onChange={(e) => update("upiQrDataUrl", e.target.value)}
              placeholder="https://…/upi-qr.png"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Optional — paste a hosted QR image URL.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            USDT (crypto)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.usdtEnabled}
              onChange={(e) => update("usdtEnabled", e.target.checked)}
            />
            <span className="font-medium">Accept USDT</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Network</Label>
              <select
                value={cfg.usdtNetwork}
                onChange={(e) => update("usdtNetwork", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {USDT_NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">INR per 1 USDT</Label>
              <Input
                type="number"
                value={cfg.usdtRateInr}
                onChange={(e) => update("usdtRateInr", Number(e.target.value))}
                placeholder="90"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Wallet address</Label>
            <Input
              value={cfg.usdtAddress}
              onChange={(e) => update("usdtAddress", e.target.value)}
              placeholder="TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email auto-verify (IMAP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.mailVerifyEnabled}
              onChange={(e) => update("mailVerifyEnabled", e.target.checked)}
            />
            <span className="font-medium">Auto-verify payments from email</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">IMAP host</Label>
              <Input
                value={cfg.mailImapHost}
                onChange={(e) => update("mailImapHost", e.target.value)}
                placeholder="imap.gmail.com"
              />
            </div>
            <div>
              <Label className="text-xs">Port</Label>
              <Input
                type="number"
                value={cfg.mailImapPort}
                onChange={(e) => update("mailImapPort", Number(e.target.value))}
                placeholder="993"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Mailbox email</Label>
            <Input
              type="email"
              value={cfg.mailImapUser}
              onChange={(e) => update("mailImapUser", e.target.value)}
              placeholder="payments@yourdomain.com"
            />
          </div>
          <div>
            <Label className="text-xs">App-password</Label>
            <Input
              type="password"
              value={cfg.mailImapPass}
              onChange={(e) => {
                setKeyTouched(true);
                update("mailImapPass", e.target.value);
              }}
              placeholder={keyTouched ? "" : "Leave unchanged to keep current"}
            />
          </div>
          <div>
            <Label className="text-xs">Sender filter</Label>
            <Input
              value={cfg.mailFromFilter}
              onChange={(e) => update("mailFromFilter", e.target.value)}
              placeholder="alerts@hdfcbank.net,noreply@binance.com"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Comma-separated senders to trust, e.g. alerts@hdfcbank.net,noreply@binance.com —
              leave blank to scan all.
            </p>
          </div>

          {testResult && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-sm",
                testResult.ok
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : "border-rose-200 dark:border-red-500/30 bg-rose-50 dark:bg-red-500/15 text-rose-800 dark:text-red-300"
              )}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div>
            <Button onClick={testEmail} disabled={testing} variant="outline">
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              Test connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save payment settings
        </Button>
      </div>
    </div>
  );
}

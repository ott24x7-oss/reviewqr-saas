"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/admin/ui/controls";
import { formatINR } from "@/lib/utils";

type Device = { id: string; name: string; model: string; version: string; active: boolean; online: boolean; lastSeenAt: string | null };
type Credit = { id: string; source: string; amountPaise: number; utr: string | null; sender: string; payerName: string | null; receivedAt: string; bodyExcerpt: string; paymentId: string | null; shopOrderId: string | null; claimedAt: string | null; reviewNote: string | null; payment?: { id: string; status: string; amount: number; user: { email: string } } | null; shopOrder?: { id: string; status: string; user: { email: string } } | null; device?: { name: string } | null };
type PendingPayment = { id: string; amount: number; createdAt: string; expiresAt: string | null; user: { email: string } };
type AdminData = { devices: Device[]; credits: Credit[]; pendingPayments: PendingPayment[] };
type DiagnosticEmail = { date: string; from: string; subject: string; dkim: string; amountPaise: number | null; utr: string | null; accepted: boolean };

const TABS = ["SMS gateway", "Bank credits", "Needs review", "Email"] as const;

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || "Request failed");
  return body;
}

export function PaymentGatewayAdmin() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("SMS gateway");
  const [data, setData] = React.useState<AdminData>({ devices: [], credits: [], pendingPayments: [] });
  const [loading, setLoading] = React.useState(true);
  const [pairing, setPairing] = React.useState<{ qrDataUrl: string; payload: Record<string, unknown> } | null>(null);
  const [sender, setSender] = React.useState("AX-AXISBK-S");
  const [message, setMessage] = React.useState("INR 999.37 has been credited to your account. UPI Ref 123456789012");
  const [parserResult, setParserResult] = React.useState<any>(null);
  const [diagnostics, setDiagnostics] = React.useState<DiagnosticEmail[]>([]);
  const [diagnosticSource, setDiagnosticSource] = React.useState<"imap" | "gmail">("imap");
  const [working, setWorking] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setData(await readJson(await fetch("/api/admin/payments/gateway", { cache: "no-store" }))); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load payment gateway data"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);
  const visibleCredits = tab === "Needs review" ? data.credits.filter((credit) => !!credit.reviewNote) : data.credits;

  async function post(action: string, extra: Record<string, unknown> = {}) {
    return readJson(await fetch("/api/admin/payments/gateway", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra })
    }));
  }

  async function createPairing() {
    setWorking(true);
    try {
      const result = await post("pair");
      setPairing(result);
      toast.success("Pairing QR created. It expires in 10 minutes.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create the pairing QR"); }
    finally { setWorking(false); }
  }

  async function revoke(deviceId: string) {
    if (!window.confirm("Revoke this SMS gateway device? It will stop accepting signed messages.")) return;
    setWorking(true);
    try { await post("revoke", { deviceId }); toast.success("Device revoked"); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not revoke device"); }
    finally { setWorking(false); }
  }

  async function testParser() {
    setWorking(true);
    try { setParserResult((await post("test-parser", { sender, message })).parsed); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Parser test failed"); }
    finally { setWorking(false); }
  }

  async function claimCredit(creditId: string, paymentId: string) {
    setWorking(true);
    try { await post("claim-credit", { creditId, paymentId }); toast.success("Credit matched and payment activated"); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not match this credit"); }
    finally { setWorking(false); }
  }

  async function testGmail() {
    setWorking(true);
    try {
      const result = await readJson(await fetch("/api/admin/settings/payments/gmail/test", { method: "POST" }));
      toast.success(result.message || "Gmail connected");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gmail connection failed"); }
    finally { setWorking(false); }
  }

  async function diagnose(source: "imap" | "gmail") {
    setWorking(true);
    setDiagnosticSource(source);
    try {
      const result = await readJson(await fetch(`/api/admin/settings/payments/gmail/diagnose?source=${source}`, { cache: "no-store" }));
      setDiagnostics(result.emails || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not read email diagnostics"); }
    finally { setWorking(false); }
  }

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Own UPI gateway</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {TABS.map((item) => <Button key={item} size="sm" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>{item}</Button>)}
        </div>

        {tab === "SMS gateway" && <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Android SMS gateway</h3><p className="text-xs text-muted-foreground">Pair the existing APK using a single use QR. The server URL contains only the app host.</p></div><Button onClick={createPairing} disabled={working}>Create pairing QR</Button></div>
            {pairing && <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border p-3"><img src={pairing.qrDataUrl} alt="SMS gateway pairing QR" className="h-48 w-48 rounded-lg border bg-white p-2" /><div className="max-w-xl space-y-1 text-xs"><p className="font-medium">Scan in the existing SMS Gateway APK. This QR expires in 10 minutes and works once.</p><code className="block break-all rounded bg-muted p-2">{JSON.stringify(pairing.payload)}</code></div></div>}
          </div>
          <div className="space-y-2"><h4 className="font-medium">Devices</h4>{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.devices.length === 0 ? <p className="text-sm text-muted-foreground">No devices paired.</p> : data.devices.map((device) => <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><div className="font-medium">{device.name} <span className={device.online ? "text-emerald-600" : "text-muted-foreground"}>· {device.online ? "Online" : "Offline"}</span></div><div className="text-xs text-muted-foreground">{device.model} · v{device.version} · last seen {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "never"}</div></div>{device.active && <Button size="sm" variant="outline" disabled={working} onClick={() => void revoke(device.id)}>Revoke</Button>}</div>)}</div>
          <div className="space-y-2 border-t pt-4"><h4 className="font-medium">Test SMS parser</h4><div className="grid gap-2 sm:grid-cols-[220px_1fr]"><div><Label>Sender ID</Label><Input value={sender} onChange={(event) => setSender(event.target.value)} /></div><div><Label>Bank message</Label><Input value={message} onChange={(event) => setMessage(event.target.value)} /></div></div><Button variant="outline" disabled={working} onClick={testParser}>Test parser</Button>{parserResult && <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(parserResult, null, 2)}</pre>}</div>
        </div>}

        {(tab === "Bank credits" || tab === "Needs review") && <div className="space-y-3"><div><h3 className="font-semibold">{tab === "Needs review" ? "Needs review" : "Bank credit ledger"}</h3><p className="text-xs text-muted-foreground">Every accepted SMS or authenticated bank email appears here. Each credit and payment can be linked once.</p></div>{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : visibleCredits.length === 0 ? <p className="text-sm text-muted-foreground">{tab === "Needs review" ? "No credits need review." : "No bank credits yet."}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Received</th><th className="p-2">Source / sender</th><th className="p-2">Amount</th><th className="p-2">UTR</th><th className="p-2">Status / review</th><th className="p-2">Action</th></tr></thead><tbody>{visibleCredits.map((credit) => {
            const matching = data.pendingPayments.filter((payment) => payment.amount === credit.amountPaise);
            return <tr key={credit.id} className="border-b align-top"><td className="p-2 text-xs">{new Date(credit.receivedAt).toLocaleString()}</td><td className="p-2"><div>{credit.source.toUpperCase()} · {credit.sender}</div><div className="max-w-[320px] truncate text-xs text-muted-foreground">{credit.bodyExcerpt}</div></td><td className="p-2 font-medium">{formatINR(credit.amountPaise)}</td><td className="p-2 font-mono text-xs">{credit.utr || "—"}</td><td className="p-2">{credit.paymentId ? <span className="text-emerald-700">Plan · {credit.payment?.user.email}{credit.reviewNote ? ` · Review: ${credit.reviewNote}` : ""}</span> : credit.shopOrderId ? <span className="text-emerald-700">Shop · {credit.shopOrder?.user.email}{credit.reviewNote ? ` · Review: ${credit.reviewNote}` : ""}</span> : credit.reviewNote ? <span className="text-amber-700">Needs review: {credit.reviewNote}</span> : <span className="text-muted-foreground">Unclaimed</span>}</td><td className="p-2">{!credit.paymentId && !credit.shopOrderId && matching.length > 0 && <select className="h-9 max-w-64 rounded-md border bg-background px-2 text-xs" defaultValue="" disabled={working} onChange={(event) => { if (event.target.value) void claimCredit(credit.id, event.target.value); }}><option value="">Match payment…</option>{matching.map((payment) => <option key={payment.id} value={payment.id}>{payment.user.email} · {formatINR(payment.amount)} · {payment.id.slice(-8)}</option>)}</select>}</td></tr>;
          })}</tbody></table></div>}</div>}

        {tab === "Email" && <div className="space-y-4"><div><h3 className="font-semibold">Email sources</h3><p className="text-xs text-muted-foreground">IMAP stays available. Gmail uses OAuth with gmail.readonly. Bank alerts are accepted only when the parsed sender domain is allow-listed and aligned DKIM passes.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={working} onClick={() => { window.location.href = "/api/admin/settings/payments/gmail/connect"; }}>Connect Gmail</Button><Button variant="outline" disabled={working} onClick={testGmail}>Test Gmail</Button><Button variant="outline" disabled={working} onClick={() => void diagnose("imap")}>Diagnose IMAP</Button><Button variant="outline" disabled={working} onClick={() => void diagnose("gmail")}>Diagnose Gmail</Button></div>{diagnostics.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Date</th><th className="p-2">Sender</th><th className="p-2">Subject</th><th className="p-2">DKIM</th><th className="p-2">Amount / UTR</th></tr></thead><tbody>{diagnostics.map((email, index) => <tr key={`${email.date}-${index}`} className="border-b"><td className="p-2 text-xs">{new Date(email.date).toLocaleString()}</td><td className="p-2">{email.from}</td><td className="max-w-[240px] truncate p-2">{email.subject}</td><td className="p-2">{email.dkim}</td><td className="p-2">{email.amountPaise == null ? "Not parsed" : `${formatINR(email.amountPaise)} · ${email.utr || "no UTR"}`}</td></tr>)}</tbody></table><p className="mt-1 text-xs text-muted-foreground">Showing {diagnostics.length} {diagnosticSource.toUpperCase()} bank sender messages.</p></div>}</div>}
      </CardContent>
    </Card>
  );
}

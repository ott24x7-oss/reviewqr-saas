"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppLanguage } from "@/components/app-ui/i18n";
import { Button } from "@/components/ui/button";

export function ShopManualUpiPayment({ orderId, amountPaise, expiresAt, upiId, payee, qrDataUrl, upiLink }: {
  orderId: string; amountPaise: number; expiresAt: string; upiId: string; payee: string; qrDataUrl: string; upiLink: string;
}) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const hi = language === "hi";
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [utr, setUtr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const amount = new Intl.NumberFormat(hi ? "hi-IN" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountPaise / 100);

  React.useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch(`/api/v1/shop/orders/${orderId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!cancelled && payload.data?.paymentStatus === "PAID") {
          setPaid(true);
          router.refresh();
        }
      } catch { /* keep polling while this order is open */ }
    }
    void check();
    const timer = window.setInterval(check, 6000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [orderId, router]);

  async function submitUtr() {
    if (!/^\d{8,22}$/.test(utr.replace(/\s/g, ""))) {
      toast.error(hi ? "8 से 22 अंकों का UTR लिखें।" : "Enter the 8 to 22 digit bank UTR.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/shop/orders/${orderId}/reference`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ utr: utr.replace(/\s/g, "") })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || "Could not submit the UTR");
      if (payload.data?.paymentStatus === "PAID") { setPaid(true); router.refresh(); }
      else toast.success(hi ? "UTR मिल गया। भुगतान सत्यापित किया जा रहा है।" : "UTR received. Checking your payment.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not submit the UTR"); }
    finally { setSaving(false); }
  }

  return <section className="space-y-3 rounded-[20px] border border-border bg-white p-4 text-sm shadow-sm">
    <h2 className="font-semibold">{hi ? "UPI से भुगतान करें" : "Pay by UPI"}</h2>
    {paid ? <p className="text-emerald-700">{hi ? "भुगतान मिल गया। ऑर्डर अपडेट हो रहा है।" : "Payment received. Your order is updating."}</p> : <>
      <div className="text-center"><div className="text-3xl font-bold">₹{amount}</div><p className="mt-1 font-semibold text-amber-700">{hi ? `ठीक ₹${amount} का भुगतान करें।` : `Pay exactly ₹${amount}.`}</p><p className="text-xs text-muted-ink">{hi ? "समय बाकी" : "Time left"}: {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p></div>
      {secondsLeft > 0 && <div className="flex flex-col items-center gap-2"><img src={qrDataUrl} alt={hi ? "UPI भुगतान QR" : "UPI payment QR"} className="h-52 w-52 rounded-xl border bg-white p-2" /><a href={upiLink} className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 font-medium text-white">{hi ? "UPI ऐप से भुगतान करें" : "Pay with UPI app"}</a></div>}
      <div className="text-xs text-muted-ink">{hi ? "UPI ID" : "UPI ID"}: <span className="font-mono text-ink">{upiId}</span> · {hi ? "प्राप्तकर्ता" : "Payee"}: {payee}</div>
      <div className="space-y-2 border-t border-border pt-3"><label htmlFor="shop-upi-utr" className="block font-medium">{hi ? "बैंक UTR / रेफ़रेंस (वैकल्पिक)" : "Bank UTR / reference (optional)"}</label><input id="shop-upi-utr" inputMode="numeric" value={utr} onChange={(event) => setUtr(event.target.value)} placeholder={hi ? "8–22 अंकों का UTR" : "8 to 22 digit UTR"} className="h-11 w-full rounded-lg border border-border px-3 font-mono" /><Button type="button" variant="outline" disabled={saving || secondsLeft === 0} onClick={submitUtr} className="w-full rounded-full">{saving ? (hi ? "जाँच हो रही है…" : "Checking…") : (hi ? "भुगतान हो गया — UTR दें" : "I've paid — submit UTR")}</Button></div>
      {secondsLeft === 0 && <p className="text-amber-800">{hi ? "यह भुगतान अनुरोध समाप्त हो गया। ऑर्डर फिर से शुरू करें।" : "This payment request expired. Start checkout again."}</p>}
    </>}
  </section>;
}

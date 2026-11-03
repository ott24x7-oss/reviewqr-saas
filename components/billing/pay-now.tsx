"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OwnUpiDetails = { id: string; payee: string; qr: string; link: string };

export function PayNowButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [upi, setUpi] = React.useState<OwnUpiDetails | null>(null);
  const [amountPaise, setAmountPaise] = React.useState(0);
  const [reference, setReference] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/youpi/invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not start payment");
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      if (json.upi) {
        setUpi(json.upi as OwnUpiDetails);
        setAmountPaise(Number(json.amountPaise) || 0);
        setNote(null);
        return;
      }
      throw new Error("Payment details were not returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  }

  async function submitReference() {
    if (!reference.trim()) {
      toast.error("Enter your bank UTR");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`/api/billing/order/${paymentId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: reference.trim() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit the UTR");
      if (json.status === "COMPLETED") {
        setNote("Payment verified. Your plan is active.");
        router.refresh();
      } else {
        setNote("UTR received. We’ll verify the payment shortly.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the UTR");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" size="sm" onClick={pay} disabled={busy} data-testid="pay-now">
        {busy ? "Starting…" : upi ? "Refresh payment details" : "Pay now"}
      </Button>
      {upi && (
        <div className="w-full space-y-3 rounded-xl border p-3 text-sm">
          <p>Pay exactly ₹{(amountPaise / 100).toFixed(2)} to {upi.payee} ({upi.id}).</p>
          <Image src={upi.qr} alt="UPI payment QR code" width={220} height={220} unoptimized className="mx-auto rounded-lg" />
          <a className="block text-center underline" href={upi.link}>Open in a UPI app</a>
          <div className="space-y-2">
            <label className="block text-xs font-medium" htmlFor={`utr-${paymentId}`}>Bank UTR / reference number</label>
            <Input
              id={`utr-${paymentId}`}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="8 to 22 digit UTR"
              inputMode="numeric"
            />
            <Button type="button" className="w-full" onClick={submitReference} disabled={verifying}>
              {verifying ? "Checking…" : "I’ve paid — verify now"}
            </Button>
          </div>
          {note && <p role="status" className="text-center text-xs text-muted-foreground">{note}</p>}
        </div>
      )}
    </div>
  );
}

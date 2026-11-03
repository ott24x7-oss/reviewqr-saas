"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type SavedAddress = { id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
type AddressDraft = Omit<SavedAddress, "id" | "line2"> & { line2: string };
const BLANK_ADDRESS: AddressDraft = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export function ShopOrderActions({
  orderId, status, paymentStatus, canPay, canCancel, cancellationStatus, refundAmountPaise, canChangeAddress, addressPincode, addressState, supportWhatsappNumber
}: {
  orderId: string; status: string; paymentStatus: string; canPay: boolean; canCancel: boolean; cancellationStatus: string | null;
  refundAmountPaise: number; canChangeAddress: boolean; addressPincode: string | null; addressState: string | null; supportWhatsappNumber: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [reason, setReason] = React.useState("Ordered by mistake");
  const [other, setOther] = React.useState("");
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [addresses, setAddresses] = React.useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = React.useState("");
  const [showNewAddress, setShowNewAddress] = React.useState(false);
  const [address, setAddress] = React.useState(BLANK_ADDRESS);

  React.useEffect(() => {
    if (!canChangeAddress) return;
    fetch("/api/v1/shop/addresses")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || "Could not load saved addresses");
        const rows = payload.data?.items as SavedAddress[] | undefined;
        setAddresses(rows || []);
        setAddressId(rows?.[0]?.id || "");
      })
      .catch(() => undefined);
  }, [canChangeAddress]);

  async function post(path: string, body?: object) {
    const response = await fetch(`/api/v1/shop/orders/${orderId}/${path}`, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Could not update this order");
    return payload.data;
  }

  async function cancel() {
    setBusy(true);
    try {
      const result = await post("cancel", { reason: reason === "Other" ? other.trim() : reason }) as { message?: string };
      setConfirmCancel(false);
      if (result.message) toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this order");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    try {
      const result = await post("payment") as { checkoutUrl: string };
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resume payment");
      setBusy(false);
    }
  }

  async function saveAddress(addressToSave: AddressDraft) {
    if ((addressPincode && addressToSave.pincode !== addressPincode) || (addressState && addressToSave.state.trim().toLowerCase() !== addressState.trim().toLowerCase())) {
      throw new Error("Address changes must keep the original PIN code and state so the order price stays the same");
    }
    const response = await fetch("/api/v1/shop/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...addressToSave, isDefault: false })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Could not save this address");
    const saved = payload.data as SavedAddress;
    setAddresses((items) => [saved, ...items]);
    setAddressId(saved.id);
    await post("address", { addressId: saved.id });
    setShowNewAddress(false);
    setAddress(BLANK_ADDRESS);
    router.refresh();
  }

  async function changeAddress() {
    setBusy(true);
    try {
      if (!addressId) throw new Error("Choose a saved address");
      await post("address", { addressId });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the delivery address");
    } finally {
      setBusy(false);
    }
  }

  async function buyAgain() {
    setBusy(true);
    try {
      const result = await post("buy-again") as { skipped: string[] };
      if (result.skipped.length) toast.info(`Unavailable items skipped: ${result.skipped.join(", ")}`);
      else toast.success("Items added to your cart");
      router.push("/dashboard/shop/cart");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add these items again");
    } finally {
      setBusy(false);
    }
  }

  const phone = supportWhatsappNumber.replace(/\D/g, "");
  const whatsapp = phone.length >= 8
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi, I need help with shop order ${orderId} (${status}).`)}`
    : null;

  return (
    <section className="space-y-3 rounded-[20px] bg-white p-4 text-sm shadow-sm">
      <h2 className="font-semibold">Manage this order</h2>
      {canPay && <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" disabled={busy} onClick={pay}>Pay now</Button>}
      {cancellationStatus && <p className="text-amber-800">Cancellation request: {cancellationStatus.toLowerCase()}</p>}
      {canCancel && !confirmCancel && <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
      {confirmCancel && <div className="space-y-3 rounded-xl border border-border p-3">
        <Label htmlFor="shop-cancel-reason">Why are you cancelling?</Label>
        <select id="shop-cancel-reason" className="h-10 w-full rounded-lg border border-border bg-white px-3" value={reason} onChange={(event) => setReason(event.target.value)}>
          <option>Ordered by mistake</option><option>Need to change my order</option><option>Delivery is taking too long</option><option>Other</option>
        </select>
        {reason === "Other" && <textarea aria-label="Cancellation reason" className="min-h-20 w-full rounded-lg border border-border p-3" maxLength={500} value={other} onChange={(event) => setOther(event.target.value)} />}
        {paymentStatus === "PAID" && <div><p>Refund amount: ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(refundAmountPaise / 100)}</p><p className="text-muted-ink">Request a refund to the original payment method. QR24x7 support will review it.</p></div>}
        <p className="text-muted-ink">Paid cancellation requests are reviewed by QR24x7 support before the order is cancelled.</p>
        <div className="flex gap-2"><Button type="button" className="rounded-full bg-ink text-white" disabled={busy || !reason || (reason === "Other" && !other.trim())} onClick={cancel}>Confirm cancellation</Button><Button type="button" variant="outline" className="rounded-full" onClick={() => setConfirmCancel(false)}>Keep order</Button></div>
      </div>}
      {canChangeAddress && <div className="space-y-2 border-t border-border pt-3">
        <h3 className="font-medium">Change delivery address</h3>
        <p className="text-muted-ink">Keep the original PIN code and state so the order price stays the same.</p>
        {addresses.length > 0 && <div className="flex flex-wrap gap-2">
          <select aria-label="Saved delivery address" className="h-10 min-w-52 flex-1 rounded-lg border border-border bg-white px-3" value={addressId} onChange={(event) => setAddressId(event.target.value)}>
            {addresses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.line1}, {item.city} {item.pincode}</option>)}
          </select>
          <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={changeAddress}>Use address</Button>
        </div>}
        {!addresses.length && <p className="text-muted-ink">No saved addresses yet.</p>}
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowNewAddress((visible) => !visible)}>{showNewAddress ? "Close" : "Add address"}</Button>
        {showNewAddress && <div className="grid gap-2 sm:grid-cols-2">
          {(["name", "phone", "line1", "line2", "city", "state", "pincode"] as const).map((key) => <div key={key} className="space-y-1">
            <Label htmlFor={`shop-address-${key}`}>{key === "line1" ? "Address line 1" : key === "line2" ? "Address line 2" : key === "pincode" ? "PIN code" : key[0].toUpperCase() + key.slice(1)}</Label>
            <input id={`shop-address-${key}`} className="h-10 w-full rounded-lg border border-border px-3" value={address[key]} onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))} />
          </div>)}
          <Button type="button" className="rounded-full bg-ink text-white sm:col-span-2" disabled={busy || !address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode} onClick={() => {
            setBusy(true);
            saveAddress(address).catch((error) => toast.error(error instanceof Error ? error.message : "Could not save this address")).finally(() => setBusy(false));
          }}>Save and use address</Button>
          <p className="text-xs text-muted-ink sm:col-span-2">Original PIN {addressPincode || "—"} · original state {addressState || "—"}</p>
        </div>}
      </div>}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={buyAgain}>Buy again</Button>
        {whatsapp && <a className="inline-flex h-10 items-center rounded-full border border-border px-4 font-medium" href={whatsapp} target="_blank" rel="noreferrer">Contact support on WhatsApp</a>}
        <a className="inline-flex h-10 items-center rounded-full border border-border px-4 font-medium" href="/help">Need help?</a>
      </div>
    </section>
  );
}

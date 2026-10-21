"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WEEK_DAYS, type WeekDay, type WeekHours } from "@/lib/tap/hours";

const DAY_LABEL: Record<WeekDay, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday"
};

type HoursState = Record<WeekDay, { open: string; close: string }>;

export type StoreFormValues = {
  holiday: boolean;
  hours: WeekHours | null;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  deliveryPincodes: string;
  deliveryChargeRupees: number;
  freeDeliveryAboveRupees: number | null;
  minOrderRupees: number;
  packingChargeRupees: number;
  gstEnabled: boolean;
  gstPercent: number;
  pricesIncludeGst: boolean;
  prepMinutes: number;
  upiId: string;
};

function hoursState(hours: WeekHours | null): HoursState {
  const out = {} as HoursState;
  for (const day of WEEK_DAYS) {
    out[day] = { open: hours?.[day]?.open || "", close: hours?.[day]?.close || "" };
  }
  return out;
}

function rupees(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function StoreForm({ businessId, initial }: { businessId: string; initial: StoreFormValues }) {
  const router = useRouter();
  const [holiday, setHoliday] = React.useState(initial.holiday);
  const [hours, setHours] = React.useState(() => hoursState(initial.hours));
  const [dineIn, setDineIn] = React.useState(initial.dineIn);
  const [takeaway, setTakeaway] = React.useState(initial.takeaway);
  const [delivery, setDelivery] = React.useState(initial.delivery);
  const [pincodes, setPincodes] = React.useState(initial.deliveryPincodes);
  const [deliveryCharge, setDeliveryCharge] = React.useState(String(initial.deliveryChargeRupees || ""));
  const [freeAbove, setFreeAbove] = React.useState(
    initial.freeDeliveryAboveRupees == null ? "" : String(initial.freeDeliveryAboveRupees)
  );
  const [minimum, setMinimum] = React.useState(String(initial.minOrderRupees || ""));
  const [packing, setPacking] = React.useState(String(initial.packingChargeRupees || ""));
  const [gstEnabled, setGstEnabled] = React.useState(initial.gstEnabled);
  const [gstPercent, setGstPercent] = React.useState(String(initial.gstPercent));
  const [pricesIncludeGst, setPricesIncludeGst] = React.useState(initial.pricesIncludeGst);
  const [prep, setPrep] = React.useState(String(initial.prepMinutes));
  const [upiId, setUpiId] = React.useState(initial.upiId);
  const [busy, setBusy] = React.useState(false);

  function setDay(day: WeekDay, key: "open" | "close", value: string) {
    setHours((current) => ({ ...current, [day]: { ...current[day], [key]: value } }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/store`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holiday,
          hours: Object.fromEntries(
            WEEK_DAYS.map((day) => {
              const row = hours[day];
              return [day, row.open && row.close ? { open: row.open, close: row.close } : null];
            })
          ),
          dineIn,
          takeaway,
          delivery,
          deliveryPincodes: pincodes,
          deliveryChargeRupees: rupees(deliveryCharge),
          freeDeliveryAboveRupees: freeAbove.trim() ? rupees(freeAbove) : null,
          minOrderRupees: rupees(minimum),
          packingChargeRupees: rupees(packing),
          gstEnabled,
          gstPercent: Math.min(28, Math.max(0, Math.round(Number(gstPercent) || 0))),
          pricesIncludeGst,
          prepMinutes: Math.min(240, Math.max(1, Math.round(Number(prep) || 20))),
          upiId
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save store settings");
      toast.success("Store settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save store settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Hours</h2>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={holiday} onChange={(event) => setHoliday(event.target.checked)} />
            Holiday mode — show Closed now, and still take orders for later
          </label>
          {WEEK_DAYS.map((day) => (
            <div key={day} className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr_1fr] sm:items-center">
              <span className="text-sm">{DAY_LABEL[day]}</span>
              <Input className="min-h-11" aria-label={`${DAY_LABEL[day]} opens`} type="time" value={hours[day].open} onChange={(event) => setDay(day, "open", event.target.value)} />
              <Input className="min-h-11" aria-label={`${DAY_LABEL[day]} closes`} type="time" value={hours[day].close} onChange={(event) => setDay(day, "close", event.target.value)} />
            </div>
          ))}
          <p className="text-sm text-muted-foreground">Leave a day blank to mark it closed. If every day is blank, the store uses the hours on the customer page.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Orders</h2>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={dineIn} onChange={(event) => setDineIn(event.target.checked)} />
            Dine-in — table number comes from the QR label
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={takeaway} onChange={(event) => setTakeaway(event.target.checked)} />
            Takeaway
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={delivery} onChange={(event) => setDelivery(event.target.checked)} />
            Home delivery
          </label>
          <label className="block text-sm">
            Delivery pincodes
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              aria-label="Delivery pincodes"
              value={pincodes}
              placeholder="560001, 560038"
              onChange={(event) => setPincodes(event.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">Leave pincodes empty to deliver to any 6-digit pincode.</p>
          <Input className="min-h-11" aria-label="Delivery charge in rupees" inputMode="decimal" placeholder="Delivery charge ₹" value={deliveryCharge} onChange={(event) => setDeliveryCharge(event.target.value)} />
          <Input className="min-h-11" aria-label="Free delivery above rupees" inputMode="decimal" placeholder="Free delivery above ₹ (optional)" value={freeAbove} onChange={(event) => setFreeAbove(event.target.value)} />
          <Input className="min-h-11" aria-label="Minimum order in rupees" inputMode="decimal" placeholder="Minimum order ₹" value={minimum} onChange={(event) => setMinimum(event.target.value)} />
          <Input className="min-h-11" aria-label="Packing charge in rupees" inputMode="decimal" placeholder="Packing charge ₹" value={packing} onChange={(event) => setPacking(event.target.value)} />
          <Input className="min-h-11" aria-label="Preparation time in minutes" inputMode="numeric" placeholder="Preparation time in minutes" value={prep} onChange={(event) => setPrep(event.target.value)} />
          <Input className="min-h-11" aria-label="UPI ID" placeholder="UPI ID, e.g. shop@okaxis" value={upiId} onChange={(event) => setUpiId(event.target.value)} />
          <p className="text-sm text-muted-foreground">Leave the UPI ID blank to take cash only. The customer pays that ID directly. Review QR does not collect the money.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">GST</h2>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={gstEnabled} onChange={(event) => setGstEnabled(event.target.checked)} />
            Charge GST
          </label>
          <Input className="min-h-11" aria-label="GST percent" inputMode="numeric" placeholder="GST percent" value={gstPercent} onChange={(event) => setGstPercent(event.target.value)} />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={pricesIncludeGst} onChange={(event) => setPricesIncludeGst(event.target.checked)} />
            Prices include GST
          </label>
          <p className="text-sm text-muted-foreground">
            When this is on, the bill shows the GST already inside the price. When it is off, GST is added on top.
          </p>
        </CardContent>
      </Card>
      <Button type="button" className="min-h-11" disabled={busy} onClick={save}>Save store settings</Button>
    </div>
  );
}

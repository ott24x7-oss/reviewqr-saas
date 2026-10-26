"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BOOKING_STATUSES, bookingStatusLabel, type BookingStatus } from "@reviewqr/shared";
import { AppText } from "@/components/app-ui/i18n";

export type BookingCard = {
  id: string;
  customerName: string;
  serviceName: string;
  optionLabel: string;
  phone: string | null;
  preferredDate: string;
  timeLabel: string;
  note: string;
  status: BookingStatus;
  canManage: boolean;
  callUrl: string | null;
  whatsAppUrl: string | null;
};

export function BookingsBoard({ items }: { items: BookingCard[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");

  async function setStatus(id: string, status: BookingStatus) {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Could not update the booking");
        return;
      }
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  if (!items.length) {
    return (
      <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <AppText en="New booking requests show up here." hi="नए बुकिंग अनुरोध यहाँ दिखेंगे।" />
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border bg-card p-4" data-testid="booking-row">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{item.customerName}</p>
              <p className="text-sm text-muted-foreground">
                {item.serviceName}
                {item.optionLabel ? ` · ${item.optionLabel}` : ""}
              </p>
              <p className="text-sm">
                {item.preferredDate}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{bookingStatusLabel(item.status, "en")}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.callUrl ? (
              <a href={item.callUrl} className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm">
                <AppText en="Call" hi="कॉल" />
              </a>
            ) : null}
            {item.whatsAppUrl ? (
              <a href={item.whatsAppUrl} className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            ) : null}
            {item.canManage
              ? BOOKING_STATUSES.filter((status) => status !== item.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => setStatus(item.id, status)}
                    className="inline-flex min-h-9 items-center rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {bookingStatusLabel(status, "en")}
                  </button>
                ))
              : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

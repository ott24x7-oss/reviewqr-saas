"use client";

import * as React from "react";
import { tapText, type TapLang, type TapStringKey } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import type { PublicStatus, ReorderLine } from "@/lib/store/order-public";
import type { OrderStatus } from "@/lib/store/order-status";

const STATUS_KEY: Record<OrderStatus, TapStringKey> = {
  NEW: "statusNew",
  ACCEPTED: "statusAccepted",
  REJECTED: "statusRejected",
  PREPARING: "statusPreparing",
  READY: "statusReady",
  OUT_FOR_DELIVERY: "statusDelivery",
  COMPLETED: "statusCompleted"
};

const TYPE_KEY: Record<string, TapStringKey> = {
  DINE_IN: "dineIn",
  TAKEAWAY: "takeaway",
  DELIVERY: "homeDelivery"
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function StatusView({
  order,
  reorder
}: {
  order: PublicStatus;
  reorder: ReorderLine[];
}) {
  const [lang, setLang] = React.useState<TapLang>(order.lang);
  const text = (key: TapStringKey) => tapText(lang, key);

  function reorderNow() {
    if (!order.reorderCode || reorder.length === 0) return;
    window.localStorage.setItem(
      `rq-cart:${order.reorderCode}`,
      JSON.stringify(reorder.map((line) => ({ ...line, note: "" })))
    );
    window.location.href = `/q/${order.reorderCode}/menu`;
  }

  return (
    <main className="store-page">
      <div className="store-wrap" style={{ paddingBottom: 32 }}>
        <header className="store-head">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm" style={{ color: "var(--store-muted)" }}>{text("trackOrder")}</p>
              <h1>{order.number}</h1>
              <p className="text-sm">{order.businessName}</p>
            </div>
            <button
              type="button"
              className="store-lang"
              style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, background: "transparent", font: "inherit" }}
              onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            >
              {lang === "hi" ? text("english") : text("hindi")}
            </button>
          </div>
        </header>
        <p className="mt-4 text-lg font-semibold">{text(STATUS_KEY[order.status])}</p>
        {TYPE_KEY[order.orderType] ? <p className="text-sm">{text(TYPE_KEY[order.orderType])}</p> : null}
        <p className="text-sm" style={{ color: "var(--store-muted)" }}>{formatWhen(order.createdAt)}</p>
        <h2 className="mt-6 text-base font-semibold">{text("orderItems")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>{item.qty} × {item.name}</li>
          ))}
        </ul>
        <p className="mt-3 font-semibold">{text("total")} {formatRupees(order.totalPaise)}</p>
        <ol className="mt-6 space-y-3">
          {order.events.map((event) => (
            <li key={`${event.status}-${event.at}`} className="border-l-2 pl-3" style={{ borderColor: "var(--store-cta)" }}>
              <div className="font-medium">{text(STATUS_KEY[event.status])}</div>
              <div className="text-sm" style={{ color: "var(--store-muted)" }}>{formatWhen(event.at)}</div>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          {order.reorderCode && reorder.length > 0 ? (
            <button type="button" className="store-order" onClick={reorderNow}>{text("reorder")}</button>
          ) : (
            <p className="text-sm" style={{ color: "var(--store-muted)" }}>{text("reorderEmpty")}</p>
          )}
        </div>
      </div>
    </main>
  );
}

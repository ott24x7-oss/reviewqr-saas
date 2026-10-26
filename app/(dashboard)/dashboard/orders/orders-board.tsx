"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/tap/order-message";
import type { DaySummary } from "@/lib/store/day";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";
import { DetailDrawer, EmptyState, StatusBadge } from "@/components/app-ui/primitives";
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  canSetStatus,
  statusActionLabel,
  type OrderCard,
  type OrderStatus
} from "@/lib/store/order-status";

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery"
};

const PAY_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI"
};

function formatWhen(iso: string, language: "en" | "hi" = "en") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 400);
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(start).catch(() => {
        ctx.close().catch(() => {});
      });
    } else {
      start();
    }
  } catch {
    // Autoplay can block the sound. The banner still shows.
  }
}

export function OrdersBoard({ initial, summary, live = true }: { initial: OrderCard[]; summary: DaySummary; live?: boolean }) {
  const { language } = useAppLanguage();
  const [orders, setOrders] = React.useState(initial);
  const [totals, setTotals] = React.useState(summary);
  const [banner, setBanner] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(null);
  const activeOrder = orders.find((order) => order.id === activeOrderId) || null;
  const seen = React.useRef<Set<string> | null>(null);
  const armed = React.useRef(false);
  const initialRef = React.useRef(initial);

  React.useEffect(() => {
    const arm = () => {
      armed.current = true;
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  React.useEffect(() => {
    if (!live) return;
    seen.current = new Set(initialRef.current.map((order) => order.id));
    let active = true;
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const res = await fetch("/api/orders");
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!Array.isArray(data.orders)) return;
        const next = data.orders as OrderCard[];
        const known = seen.current || new Set<string>();
        const fresh = next.filter((order) => !known.has(order.id));
        for (const order of next) known.add(order.id);
        seen.current = known;
        if (fresh.length === 1) setBanner(`New order ${fresh[0].number}`);
        else if (fresh.length > 1) setBanner(`${fresh.length} new orders`);
        if (fresh.length > 0 && armed.current) beep();
        if (active) {
          setOrders(next);
          if (data.summary && typeof data.summary.count === "number" && typeof data.summary.totalPaise === "number") {
            setTotals(data.summary);
          }
        }
      } catch {
        // Keep the list already on screen.
      } finally {
        running = false;
      }
    };
    const interval = window.setInterval(tick, 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [live]);

  async function setStatus(id: string, status: OrderStatus) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.order) {
        toast.error(typeof json.error === "string" ? json.error : "Could not update the order");
        return;
      }
      setOrders((prev) => prev.map((order) => (order.id === id ? (json.order as OrderCard) : order)));
    } catch {
      toast.error("Could not update the order");
    } finally {
      setPendingId(null);
    }
  }

  if (orders.length === 0) {
    return <EmptyState title={<AppText en="No orders match this view" hi="इस फ़िल्टर में कोई ऑर्डर नहीं" />} description={<AppText en="New customer orders will appear here." hi="ग्राहकों के नए ऑर्डर यहाँ दिखेंगे।" />} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground"><AppText en="Today" hi="आज" /> {formatRupees(totals.totalPaise)} · {totals.count} <AppText en={totals.count === 1 ? "order" : "orders"} hi="ऑर्डर" /><span className="hidden sm:inline"> · <AppText en="India time, rejected orders excluded" hi="भारत का समय, रद्द ऑर्डर शामिल नहीं" /></span></p>
      {banner ? (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          {banner}
        </p>
      ) : null}
      {orders.map((order) => {
        return (
          <button key={order.id} type="button" onClick={() => setActiveOrderId(order.id)} className="app-ui-focus app-ui-panel flex min-h-[76px] w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><span className="text-xs font-semibold">#{order.number.slice(-3)}</span></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{order.customerName || (language === "hi" ? "ग्राहक" : "Customer")} · {order.number}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{order.businessName} · {formatWhen(order.createdAt, language)}</span></span>
            <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">{formatRupees(order.totalPaise)}</span><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status, language)}</StatusBadge></span>
          </button>
        );
      })}
      <DetailDrawer open={!!activeOrder} onOpenChange={(open) => { if (!open) setActiveOrderId(null); }} title={activeOrder?.number || ""} description={activeOrder?.businessName}>
        {activeOrder ? <OrderDetails order={activeOrder} language={language} pending={pendingId === activeOrder.id} onSetStatus={(status) => void setStatus(activeOrder.id, status)} /> : null}
      </DetailDrawer>
    </div>
  );
}

function statusTone(status: OrderStatus): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "REJECTED") return "danger";
  if (status === "COMPLETED") return "success";
  if (status === "NEW" || status === "READY" || status === "OUT_FOR_DELIVERY") return "warning";
  return "info";
}

function statusLabel(status: OrderStatus, language: "en" | "hi") {
  if (language === "en") return STATUS_LABEL[status];
  const labels: Record<OrderStatus, string> = { NEW: "नया", ACCEPTED: "स्वीकार", REJECTED: "रद्द", PREPARING: "तैयार हो रहा", READY: "तैयार", OUT_FOR_DELIVERY: "डिलीवरी पर", COMPLETED: "पूरा" };
  return labels[status];
}

function OrderDetails({ order, language, pending, onSetStatus }: { order: OrderCard; language: "en" | "hi"; pending: boolean; onSetStatus: (status: OrderStatus) => void }) {
  const actions = ORDER_STATUSES.filter((status) => status !== order.status && canSetStatus(order.status, status));
  const type = TYPE_LABEL[order.orderType] || order.orderType;
  const payment = PAY_LABEL[order.payment] || order.payment;
  return <div className="space-y-6">
    <section><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AppText en="Order status" hi="ऑर्डर की स्थिति" /></p><div className="mt-2 flex items-center gap-2"><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status, language)}</StatusBadge><span className="text-sm text-muted-foreground">{formatWhen(order.createdAt, language)}</span></div></section>
    <section className="space-y-2 border-t pt-4"><h3 className="text-sm font-semibold"><AppText en="Customer" hi="ग्राहक" /></h3><p className="text-sm">{order.customerName || <AppText en="No name provided" hi="नाम नहीं दिया" />}</p>{order.phone ? <p className="text-sm text-muted-foreground">{order.phone}</p> : null}<p className="text-sm text-muted-foreground">{[type, order.place, order.pincode].filter(Boolean).join(" · ")}</p><p className="text-sm text-muted-foreground"><AppText en="Payment" hi="भुगतान" /> · {payment}</p></section>
    <section className="border-t pt-4"><h3 className="text-sm font-semibold"><AppText en="Items" hi="आइटम" /></h3><ul className="mt-2 divide-y">{order.items.map((line, index) => <li className="flex justify-between gap-3 py-2 text-sm" key={`${order.id}-${index}`}><span>{line.qty} × {line.name}{line.note ? <span className="block text-xs text-muted-foreground">{line.note}</span> : null}</span></li>)}</ul><div className="flex justify-between border-t pt-3 font-semibold"><span><AppText en="Total" hi="कुल" /></span><span className="tabular-nums">{formatRupees(order.totalPaise)}</span></div>{order.note ? <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">{order.note}</p> : null}</section>
    {order.canManage ? <section className="border-t pt-4"><h3 className="text-sm font-semibold"><AppText en="Update order" hi="ऑर्डर अपडेट करें" /></h3><div className="mt-3 flex flex-wrap gap-2">{actions.map((status) => <Button key={status} type="button" variant={status === "REJECTED" ? "destructive" : "outline"} disabled={pending} onClick={() => onSetStatus(status)}>{statusActionLabel(status)}</Button>)}</div></section> : null}
    <section className="flex flex-wrap gap-2 border-t pt-4">
      {order.whatsAppUrl ? <a className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium" href={order.whatsAppUrl} target="_blank" rel="noreferrer"><AppText en="WhatsApp status" hi="WhatsApp स्थिति" /></a> : null}
      {[ ["kot", "58", "KOT 58mm"], ["kot", "80", "KOT 80mm"], ["bill", "58", "Bill 58mm"], ["bill", "80", "Bill 80mm"] ].map(([doc, mm, label]) => <a key={`${doc}${mm}`} className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm" href={`/orders/${order.id}?doc=${doc}&mm=${mm}`} target="_blank" rel="noreferrer">{label}</a>)}
    </section>
  </div>;
}

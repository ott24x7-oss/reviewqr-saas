"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupees } from "@/lib/tap/order-message";
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

function statusVariant(status: OrderStatus) {
  if (status === "NEW") return "info" as const;
  if (status === "REJECTED") return "destructive" as const;
  if (status === "COMPLETED") return "success" as const;
  if (status === "READY" || status === "OUT_FOR_DELIVERY") return "warning" as const;
  return "secondary" as const;
}

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

export function OrdersBoard({ initial }: { initial: OrderCard[] }) {
  const [orders, setOrders] = React.useState(initial);
  const [banner, setBanner] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
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
        if (active) setOrders(next);
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
  }, []);

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

  if (orders.length === 0) return <p className="text-sm text-muted-foreground">No orders yet.</p>;

  return (
    <div className="grid grid-cols-1 gap-3">
      {banner ? (
        <p role="status" className="rounded-lg border border-primary/30 bg-primary-100 px-3 py-2 text-sm text-primary-800">
          {banner}
        </p>
      ) : null}
      {orders.map((order) => {
        const place = [order.place, order.pincode].filter(Boolean).join(", ");
        const who = [order.customerName || "No name", TYPE_LABEL[order.orderType] || order.orderType, place]
          .filter(Boolean)
          .join(" · ");
        const when = [formatWhen(order.createdAt), PAY_LABEL[order.payment] || order.payment].filter(Boolean).join(" · ");
        const actions = ORDER_STATUSES.filter((status) => status !== order.status && canSetStatus(order.status, status));
        return (
          <Card key={order.id}>
            <CardContent className="space-y-3 p-4 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{order.number}</div>
                  <div className="text-sm text-muted-foreground">{order.businessName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatRupees(order.totalPaise)}</div>
                  <Badge variant={statusVariant(order.status)}>{STATUS_LABEL[order.status]}</Badge>
                </div>
              </div>
              <p className="text-sm">{who}</p>
              {order.phone ? <p className="text-sm">Phone {order.phone}</p> : null}
              {when ? <p className="text-sm text-muted-foreground">{when}</p> : null}
              <ul className="text-sm">
                {order.items.map((line, index) => (
                  <li key={`${order.id}-${index}`}>
                    {line.qty} × {line.name}
                    {line.note ? <span className="text-muted-foreground"> — {line.note}</span> : null}
                  </li>
                ))}
              </ul>
              {order.note ? <p className="text-sm text-muted-foreground">{order.note}</p> : null}
              {order.canManage ? (
                <div className="flex flex-wrap gap-2">
                  {actions.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={status === "REJECTED" ? "destructive" : "outline"}
                      className="h-11 min-h-11"
                      disabled={pendingId === order.id}
                      aria-label={`${statusActionLabel(status)} ${order.number}`}
                      onClick={() => setStatus(order.id, status)}
                    >
                      {statusActionLabel(status)}
                    </Button>
                  ))}
                </div>
              ) : null}
              {order.whatsAppUrl ? (
                <a
                  className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium"
                  href={order.whatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp this status for ${order.number}`}
                >
                  WhatsApp this status
                </a>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

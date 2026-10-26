import type {
  AdminDashboard, AdminInboxAction, AdminInboxSegment, AdminKpi, AdminPlan, AdminPlanDuration, AdminSearch, AdminSearchResult,
  AdminSeriesPoint, AdminShopOrderStatus
} from "./types";

/*
 * Turns server responses into what the screens draw. Pure functions only, so
 * the contract tests can run them against the same sample payloads.
 */

function change(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function dashboardKpis(data: AdminDashboard): AdminKpi[] {
  const { kpis, series } = data;
  return [
    { key: "revenue", value: kpis.revenuePaise, changePercent: change(kpis.revenuePaise, kpis.previousRevenuePaise), series: series.revenue },
    { key: "newPaid", value: kpis.newPaid, changePercent: null, series: series.newPaid },
    { key: "mrr", value: kpis.mrrPaise, changePercent: null, series: [] },
    { key: "activeSubs", value: kpis.activeSubs, changePercent: null, series: [] },
    { key: "trials", value: kpis.trials, changePercent: null, series: [] },
    { key: "expiring", value: kpis.expiring, changePercent: null, series: [] },
    { key: "churned", value: kpis.churned, changePercent: null, series: [] },
    { key: "signups", value: kpis.signups, changePercent: change(kpis.signups, kpis.previousSignups), series: series.signups },
    { key: "scans", value: kpis.scans, changePercent: null, series: series.scans },
    { key: "shopOrders", value: kpis.shopOrders, changePercent: null, series: series.shopOrders }
  ];
}

export function dashboardRevenue(data: AdminDashboard): AdminSeriesPoint[] {
  return data.series.days.map((day, index) => ({
    label: day.slice(5),
    value: data.series.revenue[index] ?? 0,
    previousValue: data.series.previousRevenue[index] ?? 0
  }));
}

export function dashboardPlanMix(data: AdminDashboard) {
  const total = data.planMix.reduce((sum, row) => sum + row.count, 0);
  return data.planMix.map((row) => ({ name: row.name, value: total ? Math.round((row.count / total) * 100) : 0 }));
}

export type AdminHealthRow = { key: "whatsapp" | "payments" | "cron" | "errors"; value: string; healthy: boolean };

export function dashboardHealth(data: AdminDashboard, now = Date.now()): AdminHealthRow[] {
  const ago = (iso: string | null) => {
    if (!iso) return "—";
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h`;
    return `${Math.round(minutes / 1440)} d`;
  };
  const reconcileAge = data.health.lastReconcileAt ? now - new Date(data.health.lastReconcileAt).getTime() : Number.POSITIVE_INFINITY;
  return [
    { key: "whatsapp", value: data.health.whatsapp, healthy: data.health.whatsapp === "connected" },
    { key: "payments", value: ago(data.health.lastPaymentAt), healthy: !!data.health.lastPaymentAt },
    { key: "cron", value: ago(data.health.lastReconcileAt), healthy: reconcileAge < 2 * 60 * 60 * 1000 },
    { key: "errors", value: `${Math.round(data.health.errorRate * 1000) / 10}%`, healthy: data.health.errorRate < 0.05 }
  ];
}

export const INBOX_SEGMENTS: AdminInboxSegment[] = ["agents", "devices", "proofs", "payouts", "refunds", "shop", "support", "failed"];

/** What POST /inbox accepts for each segment (lib/admin/inbox.ts applyInboxAction). */
export function inboxActions(segment: AdminInboxSegment): AdminInboxAction[] {
  switch (segment) {
    case "agents": return ["approve", "reject"];
    case "devices": return ["approve", "revoke"];
    case "proofs": return ["approve"];
    case "shop": return ["advance"];
    case "refunds":
    case "support": return ["close"];
    case "failed": return ["reject"];
    case "payouts": return [];
  }
}

export function searchResults(data: AdminSearch | undefined): AdminSearchResult[] {
  if (!data) return [];
  return [
    ...data.users.map((row) => ({ id: row.id, type: "user" as const, title: row.name || row.email, subtitle: `${row.role} · ${row.email} · ${row.phone}` })),
    ...data.businesses.map((row) => ({ id: row.id, type: "business" as const, title: row.name, subtitle: `${row.slug} · ${row.isActive ? "ACTIVE" : "SUSPENDED"}` })),
    ...data.payments.map((row) => ({ id: row.id, type: "payment" as const, title: row.invoiceNumber || row.utr || row.id, subtitle: `${row.status} · ${row.createdAt.slice(0, 10)}` })),
    ...data.agents.map((row) => ({ id: row.id, type: "agent" as const, title: row.name, subtitle: `${row.code} · ${row.status} · ${row.phone}` })),
    ...data.orders.map((row) => ({ id: row.id, type: "order" as const, title: row.invoiceNumber || row.id, subtitle: `${row.status} · ${row.createdAt.slice(0, 10)}` }))
  ];
}

/** Same rule as adminPlanChangeIsLong: anything longer than one month needs a reason and a step-up. */
export function planChangeIsLong(plan: AdminPlan | undefined, duration?: AdminPlanDuration) {
  if (!plan) return false;
  const price = plan.prices.find((row) => row.duration === duration && row.active) ?? plan.prices.find((row) => row.active) ?? plan.prices[0];
  return !!price && price.duration !== "MONTH_1";
}

export const SHOP_PIPELINE: AdminShopOrderStatus[] = ["PAID", "PROOF_SENT", "APPROVED", "PRINTING", "PACKED", "SHIPPED", "DELIVERED"];

export function maskPhone(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

/** Asia/Kolkata start of a YYYY-MM-DD day. Empty means no filter. */
export function orderListSince(from: string | null | undefined): { ok: true; since: Date | null } | { ok: false; error: string } {
  const raw = (from || "").trim();
  if (!raw) return { ok: true, since: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: false, error: "Use a date like 2026-10-25" };
  const since = new Date(`${raw}T00:00:00+05:30`);
  if (Number.isNaN(since.getTime())) return { ok: false, error: "Use a date like 2026-10-25" };
  return { ok: true, since };
}

export type KotLine = { qty: number; name: string; note: string; variant: string };

export function kotText(order: { number: string; place: string; note: string; items: KotLine[] }) {
  const lines = [`KOT #${order.number}`];
  if (order.place.trim()) lines.push(order.place.trim());
  for (const item of order.items) {
    const extra = [item.variant, item.note].map((part) => part.trim()).filter(Boolean).join(" · ");
    lines.push(`${item.qty} x ${item.name}${extra ? ` (${extra})` : ""}`);
  }
  if (order.note.trim()) lines.push(order.note.trim());
  return lines.join("\n");
}

import type { AdminInbox, AdminInboxItem } from "./types";

/** GET /inbox returns one segment at a time, so the count to adjust is `inbox.segment`. */
export function optimisticallyResolveInbox(inbox: AdminInbox, itemIds: string | string[]): AdminInbox {
  const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
  const removed = inbox.items.filter((row) => ids.includes(row.id)).length;
  if (!removed) return inbox;
  return {
    ...inbox,
    items: inbox.items.filter((row) => !ids.includes(row.id)),
    counts: { ...inbox.counts, [inbox.segment]: Math.max(0, inbox.counts[inbox.segment] - removed) }
  };
}

export function restoreInboxItem(inbox: AdminInbox, item: AdminInboxItem): AdminInbox {
  if (inbox.items.some((row) => row.id === item.id)) return inbox;
  const items = [...inbox.items, item].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    ...inbox,
    items,
    counts: { ...inbox.counts, [inbox.segment]: inbox.counts[inbox.segment] + 1 }
  };
}

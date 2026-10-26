import type { AdminInbox, AdminInboxItem } from "./types";

export function optimisticallyResolveInbox(inbox: AdminInbox, itemId: string): AdminInbox {
  const item = inbox.items.find((row) => row.id === itemId);
  if (!item) return inbox;
  const remaining = inbox.items.filter((row) => row.id !== itemId);
  return {
    ...inbox,
    items: remaining,
    counts: { ...inbox.counts, [item.segment]: Math.max(0, inbox.counts[item.segment] - 1) }
  };
}

export function rollbackInbox(previous: AdminInbox): AdminInbox {
  return previous;
}

export function restoreInboxItem(inbox: AdminInbox, item: AdminInboxItem): AdminInbox {
  if (inbox.items.some((row) => row.id === item.id)) return inbox;
  const items = [...inbox.items, item].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    ...inbox,
    items,
    counts: { ...inbox.counts, [item.segment]: inbox.counts[item.segment] + 1 }
  };
}

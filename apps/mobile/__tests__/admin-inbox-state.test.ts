import type { AdminInbox } from "../src/admin/types";
import { optimisticallyResolveInbox, restoreInboxItem } from "../src/admin/inbox-state";

const inbox: AdminInbox = {
  counts: { agents: 1, devices: 0, proofs: 0, payouts: 0, refunds: 0, orders: 0, support: 0, payments: 0 },
  nextCursor: null,
  items: [{ id: "agent-1", segment: "agents", title: "Amit", subtitle: "New agent", createdAt: "2026-01-01T00:00:00.000Z", status: "PENDING", actions: ["approve", "reject"] }]
};

describe("admin inbox optimistic resolution", () => {
  it("removes a resolved card and decrements its count", () => {
    const next = optimisticallyResolveInbox(inbox, "agent-1");
    expect(next.items).toHaveLength(0);
    expect(next.counts.agents).toBe(0);
  });

  it("restores a card after the server action fails", () => {
    const optimistic = optimisticallyResolveInbox(inbox, "agent-1");
    const rolledBack = restoreInboxItem(optimistic, inbox.items[0]);
    expect(rolledBack.items).toEqual(inbox.items);
    expect(rolledBack.counts.agents).toBe(1);
  });
});

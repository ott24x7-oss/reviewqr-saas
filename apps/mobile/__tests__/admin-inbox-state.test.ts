import type { AdminInbox } from "../src/admin/types";
import { optimisticallyResolveInbox, restoreInboxItem } from "../src/admin/inbox-state";

const inbox: AdminInbox = {
  counts: { agents: 2, devices: 0, proofs: 0, payouts: 0, refunds: 0, shop: 0, support: 0, failed: 0 },
  segment: "agents",
  nextCursor: null,
  items: [
    { id: "ap-1", title: "Amit", subtitle: "Depth 1", createdAt: "2026-01-02T00:00:00.000Z", status: "PENDING" },
    { id: "ap-2", title: "Neha", subtitle: "Depth 2", createdAt: "2026-01-01T00:00:00.000Z", status: "PENDING" }
  ]
};

describe("admin inbox optimistic resolution", () => {
  it("removes a resolved card and decrements the listed segment's count", () => {
    const next = optimisticallyResolveInbox(inbox, "ap-1");
    expect(next.items.map((item) => item.id)).toEqual(["ap-2"]);
    expect(next.counts.agents).toBe(1);
  });

  it("removes a bulk approval in one step", () => {
    const next = optimisticallyResolveInbox(inbox, ["ap-1", "ap-2"]);
    expect(next.items).toHaveLength(0);
    expect(next.counts.agents).toBe(0);
  });

  it("restores a card after the server action fails", () => {
    const optimistic = optimisticallyResolveInbox(inbox, "ap-1");
    const rolledBack = restoreInboxItem(optimistic, inbox.items[0]);
    expect(rolledBack.items).toEqual(inbox.items);
    expect(rolledBack.counts.agents).toBe(2);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    itemImageJob: { findMany: vi.fn(), updateMany: vi.fn() },
    menuItem: { update: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn()
  },
  tx: { itemImageJob: { updateMany: vi.fn() }, menuItem: { update: vi.fn() } },
  logAudit: vi.fn(), sendPushToUsers: vi.fn()
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/admin", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/push", () => ({ sendPushToUsers: mocks.sendPushToUsers }));

import { approveItemImageJobs, rejectItemImageJobs } from "../../lib/admin/item-image-review";

describe("admin item image decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
    mocks.prisma.itemImageJob.findMany.mockResolvedValue([{
      id: "job-1", itemId: "item-1", candidateUrl: "https://cdn.test/new.webp",
      item: { id: "item-1", photo: "https://cdn.test/old.webp", photos: ["https://cdn.test/gallery.webp"] },
      businessId: "business-1", business: { id: "business-1", name: "Tea Shop", ownerId: "owner-1" }
    }]);
    mocks.tx.itemImageJob.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.menuItem.update.mockResolvedValue({});
    mocks.prisma.notification.create.mockResolvedValue({});
    mocks.sendPushToUsers.mockResolvedValue(undefined);
  });

  it("sets the approved candidate as the item photo and keeps the old photo only when selected", async () => {
    const result = await approveItemImageJobs("admin-1", ["job-1"], true);
    expect(result.approved).toBe(1);
    expect(mocks.tx.menuItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { photo: "https://cdn.test/new.webp", photos: ["https://cdn.test/old.webp", "https://cdn.test/gallery.webp"] }
    });
    expect(mocks.tx.itemImageJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED", decidedById: "admin-1" }) }));
    expect(mocks.prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(mocks.sendPushToUsers).toHaveBeenCalledTimes(1);
  });

  it("rejects ready jobs without approving a photo", async () => {
    mocks.prisma.itemImageJob.updateMany.mockResolvedValue({ count: 1 });
    const result = await rejectItemImageJobs("admin-1", ["job-1"]);
    expect(result.rejected).toBe(1);
    expect(mocks.prisma.itemImageJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REJECTED", decidedById: "admin-1" } }));
  });
});

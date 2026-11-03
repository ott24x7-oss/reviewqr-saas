import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireBusinessRole: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ requireBusinessRole: mocks.requireBusinessRole, planOwner: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/admin", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/ssrf", () => ({ assertSafeOutboundUrl: vi.fn() }));
vi.mock("@/lib/plans/feature-gate", () => ({ featureBlock: vi.fn() }));
vi.mock("@/lib/plans/entitlements", () => ({ limit: vi.fn() }));

import { commitMenuBulk, previewMenuBulk } from "../../lib/store/menu-bulk";

describe("bulk menu business access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireBusinessRole.mockResolvedValue(null);
  });

  it("rejects a different owner's business during preview and commit", async () => {
    const file = Buffer.from("name,price\nTea,20\n", "utf8");
    await expect(previewMenuBulk("owner-a", "business-b", file, "items.csv")).resolves.toMatchObject({ error: "Not found", status: 404 });
    await expect(commitMenuBulk("owner-a", "business-b", [{ name: "Tea" }], [], "add_new")).resolves.toMatchObject({ error: "Not found", status: 404 });
    expect(mocks.requireBusinessRole).toHaveBeenCalledWith("owner-a", "business-b", "manage");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminActor: vi.fn(), requireAdminApi: vi.fn()
}));
vi.mock("@/lib/admin/guard", () => ({ requireAdminActor: mocks.requireAdminActor }));
vi.mock("@/lib/admin", () => ({ requireAdminApi: mocks.requireAdminApi, logAudit: vi.fn() }));

import { GET as getAdminJobs, POST as decideAdminJob } from "../../app/api/v1/admin/item-image-jobs/route";
import { POST as createBusinessJobs } from "../../app/api/admin/businesses/[id]/item-images/route";

function forbidden() {
  return { ok: false as const, response: NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access only" } }, { status: 403 }) };
}

describe("item image job admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminActor.mockResolvedValue(forbidden());
    mocks.requireAdminApi.mockResolvedValue({ error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });
  });

  it("blocks non-admin access to the ready queue and approve/reject actions", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/item-image-jobs", { method: "POST", body: JSON.stringify({ action: "approve", jobIds: ["job-1"] }) });
    expect((await getAdminJobs(new NextRequest("http://localhost/api/v1/admin/item-image-jobs"))).status).toBe(403);
    expect((await decideAdminJob(request)).status).toBe(403);
  });

  it("blocks non-admin access to creating photo generation jobs", async () => {
    const response = await createBusinessJobs(
      new NextRequest("http://localhost/api/admin/businesses/business-1/item-images", { method: "POST", body: JSON.stringify({ itemIds: ["item-1"] }) }),
      { params: { id: "business-1" } }
    );
    expect(response?.status).toBe(403);
  });
});

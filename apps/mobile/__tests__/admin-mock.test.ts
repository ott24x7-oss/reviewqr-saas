import { adminMockRequest, resetAdminMock } from "../src/admin/mock";

beforeEach(() => resetAdminMock());

describe("admin mock API", () => {
  it("keeps new sign-ins pending until a device approval poll", async () => {
    const auth = await adminMockRequest<{ status: string }>("/auth", { method: "POST", body: JSON.stringify({ phase: "verify", phone: "9876543210", code: "123456" }) });
    expect(auth.status).toBe("PENDING");
    const first = await adminMockRequest<{ status: string }>("/auth");
    const second = await adminMockRequest<{ status: string }>("/auth");
    const third = await adminMockRequest<{ status: string }>("/auth");
    expect([first.status, second.status, third.status]).toEqual(["PENDING", "PENDING", "ACTIVE"]);
  });

  it("runs a step-up OTP round trip and requires its token for sensitive plan edits", async () => {
    const challenge = await adminMockRequest<{ challengeId: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "request", action: "change_plan_price", target: "growth" }) });
    await expect(adminMockRequest("/step-up", { method: "POST", body: JSON.stringify({ phase: "verify", action: "change_plan_price", challengeId: challenge.challengeId, code: "000000" }) })).rejects.toThrow("INVALID_OTP");
    const verified = await adminMockRequest<{ stepUpToken: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "verify", action: "change_plan_price", challengeId: challenge.challengeId, code: "123456" }) });
    const edit = { method: "PATCH", body: JSON.stringify({ pricePaise: 299900 }) };
    await expect(adminMockRequest("/plans/growth", edit)).rejects.toThrow("STEP_UP_REQUIRED");
    const updated = await adminMockRequest<{ pricePaise: number }>("/plans/growth", { ...edit, headers: { "X-Step-Up": verified.stepUpToken } });
    expect(updated.pricePaise).toBe(299900);
  });

  it("accepts a step-up token only for its own action and only once", async () => {
    const verified = await adminMockRequest<{ stepUpToken: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "verify", action: "approve_device", challengeId: "c", code: "123456" }) });
    const edit = { method: "PATCH", body: JSON.stringify({ pricePaise: 199900 }), headers: { "X-Step-Up": verified.stepUpToken } };
    await expect(adminMockRequest("/plans/growth", edit)).rejects.toThrow("STEP_UP_REQUIRED");
    const device = { method: "POST", body: JSON.stringify({ action: "approve" }), headers: { "X-Step-Up": verified.stepUpToken } };
    await expect(adminMockRequest("/devices/d-1/action", device)).resolves.toEqual({ ok: true });
    await expect(adminMockRequest("/devices/d-1/action", device)).rejects.toThrow("STEP_UP_REQUIRED");
  });

  it("asks for a reason and a plan step-up before a yearly plan change", async () => {
    const path = "/users/u-1/action";
    await expect(adminMockRequest(path, { method: "POST", body: JSON.stringify({ action: "change-plan", plan: "Growth" }) })).rejects.toThrow("REASON_REQUIRED");
    await expect(adminMockRequest(path, { method: "POST", body: JSON.stringify({ action: "change-plan", plan: "Growth", reason: "Partner deal" }) })).rejects.toThrow("STEP_UP_REQUIRED");
    const verified = await adminMockRequest<{ stepUpToken: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "verify", action: "change_user_plan", challengeId: "c", code: "123456" }) });
    await expect(adminMockRequest(path, { method: "POST", headers: { "X-Step-Up": verified.stepUpToken }, body: JSON.stringify({ action: "change-plan", plan: "Growth", reason: "Partner deal" }) })).resolves.toMatchObject({ ok: true });
    await expect(adminMockRequest(path, { method: "POST", body: JSON.stringify({ action: "change-plan", plan: "Starter" }) })).resolves.toMatchObject({ ok: true });
  });

  it("seeds the ninety-day dashboard and account lists", async () => {
    const dashboard = await adminMockRequest<{ revenue: unknown[] }>("/dashboard?range=90d");
    const team = await adminMockRequest<{ members: unknown[] }>("/team");
    expect(dashboard.revenue).toHaveLength(90);
    expect(team.members).toHaveLength(3);
  });

  it("returns only matching results from mock search", async () => {
    const results = await adminMockRequest<{ items: { id: string }[] }>("/search?q=Madhav");
    expect(results.items.map((item) => item.id)).toEqual(["b-1", "pay-1"]);
  });
});

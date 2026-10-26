const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  })
}));

import {
  ADMIN_ACCESS_EXPIRES_KEY, ADMIN_DEVICE_SECRET_KEY, ADMIN_REFRESH_KEY, AdminApiError, adminApi, forgetAdminDevice,
  readAdminDevice, refreshAdminSession, rememberAdminDevice, setAdminSessionListener, setAdminTransport, writeAdminTokens,
  type AdminTransport
} from "../src/admin/api";
import { adminMockTransport, MOCK_OTP, resetAdminMock, revokeMockAdminDevice, seedActiveMockAdmin } from "../src/admin/mock";
import type { AdminDevice } from "../src/admin/types";

const calls: { path: string; method: string; headers: Record<string, string>; body?: string }[] = [];
const recording: AdminTransport = async (path, request) => {
  calls.push({ path, ...request });
  return adminMockTransport(path, request);
};

function verify(extra: { deviceId?: string; deviceSecret?: string } = {}) {
  return adminApi.verifyOtp({ phone: "9876543210", code: MOCK_OTP, deviceName: "Pixel 9", platform: "android", ...extra });
}

async function signIn(extra: { deviceId?: string; deviceSecret?: string } = {}) {
  const session = await verify(extra);
  await writeAdminTokens(session);
  await rememberAdminDevice(session);
  return session;
}

async function activeAdmin() {
  const session = seedActiveMockAdmin();
  await writeAdminTokens(session);
  return session;
}

beforeEach(() => {
  mockStore.clear();
  calls.length = 0;
  resetAdminMock();
  setAdminTransport(recording);
  setAdminSessionListener({});
});

afterAll(() => setAdminTransport(null));

describe("admin sign-in and device secret", () => {
  it("keeps the secret in secure storage and forgets it on revoke", async () => {
    expect(await readAdminDevice()).toBeNull();
    await rememberAdminDevice({ device: { id: "device-9" } });
    expect(await readAdminDevice()).toBeNull();
    await rememberAdminDevice({ device: { id: "device-9" }, deviceSecret: "s3cret" });
    expect(mockStore.get(ADMIN_DEVICE_SECRET_KEY)).toBe("s3cret");
    expect(await readAdminDevice()).toEqual({ deviceId: "device-9", deviceSecret: "s3cret" });
    await forgetAdminDevice();
    expect(await readAdminDevice()).toBeNull();
  });

  it("registers a new phone as PENDING, and guarded routes answer DEVICE_PENDING", async () => {
    const onDeviceCode = jest.fn();
    setAdminSessionListener({ onDeviceCode });
    const session = await signIn();
    expect(session.device.status).toBe("PENDING");
    expect(session.deviceSecret).toBeTruthy();
    await expect(adminApi.dashboard("7d")).rejects.toMatchObject({ status: 403, code: "DEVICE_PENDING" });
    expect(onDeviceCode).toHaveBeenCalledWith("DEVICE_PENDING");
  });

  it("reuses an approved phone only when the stored secret is sent", async () => {
    const first = await signIn();
    // Pending phones are approved after a few refreshes in the mock, as if another admin approved them.
    let device: AdminDevice | null = null;
    setAdminSessionListener({ onDevice: (next) => { device = next; } });
    for (let i = 0; i < 3; i += 1) await refreshAdminSession();
    expect(device).toMatchObject({ id: first.device.id, status: "ACTIVE" });

    const idOnly = await verify({ deviceId: first.device.id });
    expect(idOnly.device.id).not.toBe(first.device.id);
    expect(idOnly.device.status).toBe("PENDING");
    expect(idOnly.deviceSecret).toBeTruthy();

    const saved = await readAdminDevice();
    const reused = await verify(saved ?? {});
    expect(reused.device).toMatchObject({ id: first.device.id, status: "ACTIVE" });
    expect(reused.deviceSecret).toBeUndefined();
  });

  it("sends the saved device id and secret on verify, as the server's schema expects", async () => {
    const first = await signIn();
    await verify((await readAdminDevice()) ?? {});
    const body = JSON.parse(calls.filter((call) => call.path === "/auth/otp/verify")[1].body ?? "{}");
    expect(body).toMatchObject({ deviceId: first.device.id, deviceSecret: first.deviceSecret, platform: "android" });
  });
});

describe("admin token refresh", () => {
  it("rotates the refresh token: the old one is refused afterwards", async () => {
    const session = await activeAdmin();
    const next = await refreshAdminSession();
    expect(next).toBeTruthy();
    expect(mockStore.get(ADMIN_REFRESH_KEY)).not.toBe(session.refreshToken);
    const replay = await adminMockTransport("/auth/refresh", { method: "POST", headers: {}, body: JSON.stringify({ refreshToken: session.refreshToken }) });
    expect(replay.status).toBe(401);
  });

  it("refreshes before a request when the access token has expired", async () => {
    await activeAdmin();
    mockStore.set(ADMIN_ACCESS_EXPIRES_KEY, String(Date.now() - 1000));
    await adminApi.plans();
    expect(calls.map((call) => call.path)).toEqual(["/auth/refresh", "/plans"]);
  });

  it("refreshes once and retries when the admin guard answers 403 FORBIDDEN", async () => {
    await activeAdmin();
    mockStore.set("qr24x7.admin.access", "stale-token");
    const plans = await adminApi.plans();
    expect(plans.items.length).toBeGreaterThan(0);
    expect(calls.map((call) => call.path)).toEqual(["/plans", "/auth/refresh", "/plans"]);
  });

  it("signs out when the refresh token is refused (a revoked phone)", async () => {
    const session = await activeAdmin();
    const onSignedOut = jest.fn();
    setAdminSessionListener({ onSignedOut });
    revokeMockAdminDevice(session.device.id);
    expect(await refreshAdminSession()).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
    expect(mockStore.get(ADMIN_REFRESH_KEY)).toBeUndefined();
  });

  it("reports DEVICE_REVOKED from a guarded route", async () => {
    const session = await activeAdmin();
    const onDeviceCode = jest.fn();
    setAdminSessionListener({ onDeviceCode });
    revokeMockAdminDevice(session.device.id);
    await expect(adminApi.settings()).rejects.toMatchObject({ code: "DEVICE_REVOKED" });
    expect(onDeviceCode).toHaveBeenCalledWith("DEVICE_REVOKED");
  });
});

describe("admin step-up", () => {
  it("sends a code without an action, then binds the token to the action with the code", async () => {
    await activeAdmin();
    const sent = await adminApi.sendStepUp();
    expect(sent.sent).toBe(true);
    expect(JSON.parse(calls[0].body ?? "")).toEqual({});
    await expect(adminApi.verifyStepUp("change_plan_price", "000000")).rejects.toMatchObject({ code: "VALIDATION" });
    const token = await adminApi.verifyStepUp("change_plan_price", MOCK_OTP);
    expect(JSON.parse(calls[calls.length - 1].body ?? "")).toEqual({ code: MOCK_OTP, action: "change_plan_price" });
    expect(token.expiresIn).toBeGreaterThan(0);
  });

  it("requires the token in X-Step-Up for a price change, and spends it once", async () => {
    await activeAdmin();
    const patch = { duration: "YEAR_1" as const, pricePaise: 299900 };
    await expect(adminApi.patchPlan("growth", patch)).rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    const { stepUpToken } = await adminApi.verifyStepUp("change_plan_price", MOCK_OTP);
    await adminApi.patchPlan("growth", patch, stepUpToken);
    expect(calls[calls.length - 1].headers["X-Step-Up"]).toBe(stepUpToken);
    await expect(adminApi.patchPlan("growth", patch, stepUpToken)).rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    const plans = await adminApi.plans();
    expect(plans.items.find((plan) => plan.id === "growth")?.prices.find((price) => price.duration === "YEAR_1")?.pricePaise).toBe(299900);
  });

  it("refuses a token issued for another action", async () => {
    await activeAdmin();
    const { stepUpToken } = await adminApi.verifyStepUp("approve_device", MOCK_OTP);
    await expect(adminApi.patchPlan("growth", { modules: ["qr"] }, stepUpToken)).rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    // The refused token was not spent, so it still works for its own action.
    await expect(adminApi.deviceAction("dev-2", "approve", stepUpToken)).resolves.toMatchObject({ devices: expect.any(Array) });
  });

  it("asks for a reason before the step-up on a long plan change", async () => {
    await activeAdmin();
    await expect(adminApi.userAction("user-1", { action: "plan", planId: "growth", duration: "YEAR_1" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(adminApi.userAction("user-1", { action: "plan", planId: "growth", duration: "YEAR_1", reason: "Partner deal" })).rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    const { stepUpToken } = await adminApi.verifyStepUp("change_user_plan", MOCK_OTP);
    await expect(adminApi.userAction("user-1", { action: "plan", planId: "growth", duration: "YEAR_1", reason: "Partner deal" }, stepUpToken)).resolves.toBeTruthy();
    // A one-month plan needs neither.
    await expect(adminApi.userAction("user-1", { action: "plan", planId: "starter" })).resolves.toBeTruthy();
  });

  it("surfaces server errors as AdminApiError with the envelope code", async () => {
    await activeAdmin();
    const failure = await adminApi.search("x").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AdminApiError);
    expect(failure).toMatchObject({ status: 400, code: "VALIDATION", message: "Type at least 2 characters" });
  });
});

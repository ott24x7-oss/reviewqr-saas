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

import { ADMIN_DEVICE_SECRET_KEY, forgetAdminDevice, readAdminDevice, rememberAdminDevice } from "../src/admin/api";
import { adminMockRequest, resetAdminMock } from "../src/admin/mock";

type Verified = { status: string; deviceId: string; deviceSecret?: string };

function verify(extra: Record<string, string> = {}) {
  return adminMockRequest<Verified>("/auth", { method: "POST", body: JSON.stringify({ phase: "verify", phone: "9876543210", code: "123456", ...extra }) });
}

beforeEach(() => {
  mockStore.clear();
  resetAdminMock();
});

describe("admin device secret", () => {
  it("keeps the secret in secure storage and forgets it on revoke", async () => {
    expect(await readAdminDevice()).toBeNull();
    await rememberAdminDevice({ deviceId: "device-9" });
    expect(await readAdminDevice()).toBeNull();
    await rememberAdminDevice({ deviceId: "device-9", deviceSecret: "s3cret" });
    expect(mockStore.get(ADMIN_DEVICE_SECRET_KEY)).toBe("s3cret");
    expect(await readAdminDevice()).toEqual({ deviceId: "device-9", deviceSecret: "s3cret" });
    await forgetAdminDevice();
    expect(await readAdminDevice()).toBeNull();
  });

  it("reuses an approved phone only when the stored secret is sent", async () => {
    const first = await verify();
    expect(first.deviceSecret).toBeTruthy();
    await rememberAdminDevice(first);
    for (let i = 0; i < 3; i += 1) await adminMockRequest("/auth");

    const idOnly = await verify({ deviceId: first.deviceId });
    expect(idOnly.deviceId).not.toBe(first.deviceId);
    expect(idOnly.status).toBe("PENDING");
    expect(idOnly.deviceSecret).toBeTruthy();

    await rememberAdminDevice(idOnly);
    for (let i = 0; i < 3; i += 1) await adminMockRequest("/auth");
    const saved = await readAdminDevice();
    const reused = await verify(saved ?? {});
    expect(reused).toMatchObject({ deviceId: idOnly.deviceId, status: "ACTIVE" });
    expect(reused.deviceSecret).toBeUndefined();
  });
});

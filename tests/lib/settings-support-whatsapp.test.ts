import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rows: new Map<string, { key: string; value: string }>(),
  findUnique: vi.fn(),
  upsert: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: {
      findUnique: db.findUnique,
      upsert: db.upsert
    }
  }
}));

import { getSupportWhatsApp, invalidateSettingsCache } from "@/lib/settings";

const envKeys = ["SUPPORT_WHATSAPP_NUMBER", "SUPPORT_WHATSAPP"] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

describe("getSupportWhatsApp", () => {
  beforeEach(() => {
    db.rows.clear();
    db.findUnique.mockReset();
    db.upsert.mockReset();
    db.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) => db.rows.get(where.key) || null);
    db.upsert.mockImplementation(async ({ where, create, update }: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }) => {
      const existing = db.rows.get(where.key);
      const row = existing ? { ...existing, ...update } : create;
      db.rows.set(where.key, row);
      return row;
    });
    invalidateSettingsCache();
    for (const key of envKeys) delete process.env[key];
  });

  it("uses the site setting before legacy and environment values, returning digits only", async () => {
    db.rows.set("site", { key: "site", value: JSON.stringify({ supportWhatsappNumber: "+91 98765-43210" }) });
    db.rows.set("support", { key: "support", value: JSON.stringify({ whatsappNumber: "919999999999" }) });
    process.env.SUPPORT_WHATSAPP_NUMBER = "919111111111";

    await expect(getSupportWhatsApp()).resolves.toBe("919876543210");
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("migrates the legacy help number into site settings when the site value is empty", async () => {
    db.rows.set("site", { key: "site", value: JSON.stringify({ supportWhatsappNumber: " " }) });
    db.rows.set("support", { key: "support", value: JSON.stringify({ whatsappNumber: "+91 98765 43210" }) });
    process.env.SUPPORT_WHATSAPP_NUMBER = "919111111111";

    await expect(getSupportWhatsApp()).resolves.toBe("919876543210");
    await expect(getSupportWhatsApp()).resolves.toBe("919876543210");
    expect(JSON.parse(db.rows.get("site")!.value)).toEqual({ supportWhatsappNumber: "919876543210" });
    expect(db.findUnique.mock.calls.filter(([query]) => query.where.key === "support")).toHaveLength(1);
  });

  it("uses SUPPORT_WHATSAPP_NUMBER before the older SUPPORT_WHATSAPP fallback", async () => {
    process.env.SUPPORT_WHATSAPP_NUMBER = "+91 98765 43210";
    process.env.SUPPORT_WHATSAPP = "919111111111";

    await expect(getSupportWhatsApp()).resolves.toBe("919876543210");

    delete process.env.SUPPORT_WHATSAPP_NUMBER;
    invalidateSettingsCache();
    await expect(getSupportWhatsApp()).resolves.toBe("919111111111");
  });
});

afterAll(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

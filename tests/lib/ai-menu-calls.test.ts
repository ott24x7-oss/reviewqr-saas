import { afterEach, describe, expect, it, vi } from "vitest";

const quota = vi.hoisted(() => ({ modules: [] as Array<string | undefined> }));

vi.mock("../../lib/entitlements", async () => {
  const actual = await vi.importActual<typeof import("../../lib/entitlements")>("../../lib/entitlements");
  return {
    ...actual,
    consumeAiCall: async (_businessId: string, module?: string) => {
      quota.modules.push(module);
    }
  };
});

vi.mock("../../lib/ssrf", () => ({
  assertSafeOutboundUrl: async (url: string) => new URL(url)
}));

import { cleanPastedItems, generateMenuFromPhoto, readProductPhoto, suggestItemCopy } from "../../lib/ai";
import type { AiConfig } from "../../lib/settings";

const cfg: AiConfig = {
  enabled: true,
  apiUrl: "https://ai.example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  dailyCapPaise: 1000,
  estimatePaisePerCall: 10
};

const menuReply = '{"items":[{"name":"Tea","priceRupees":10,"veg":"VEG"}]}';
const productReply = '{"name":"Tea","category":"Drinks","description":"Hot tea","veg":"VEG","brand":"","colour":"","durationMinutes":null}';

describe("menu AI module quota reservations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    quota.modules = [];
  });

  it("uses MENU for menu photos, item copy, pasted items, and item photo reads", async () => {
    const replies = [menuReply, '{"description":"A warm cup of tea."}', menuReply, productReply];
    const fetchMock = vi.fn(async () => {
      const content = replies.shift();
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const image = "data:image/jpeg;base64,AAAA";
    const ctx = { name: "Sample Cafe" };
    await generateMenuFromPhoto(cfg, image, "business-1");
    await suggestItemCopy(cfg, ctx, { field: "description", name: "Tea" }, "business-1");
    await cleanPastedItems(cfg, "Tea 10", "business-1");
    await readProductPhoto(cfg, image, "business-1");

    expect(quota.modules).toEqual(["MENU", "MENU", "MENU", "MENU"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

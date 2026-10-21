import { afterEach, describe, expect, it, vi } from "vitest";
import { createDelhivery } from "../../lib/shop/shipping-delhivery";
import { providerForEstimates } from "../../lib/shop/shipping-resolve";
import { createShiprocket } from "../../lib/shop/shipping-shiprocket";
import {
  DEFAULT_SHIPPING,
  adminCarrierState,
  createMockProvider,
  presetForWeight,
  readCachedToken,
  selectRate,
  type CarrierFetch,
  type ShippingConfig
} from "../../lib/shop/shipping";

const query = { pincode: "560001", weightGrams: 350, paymentMode: "PREPAID" as const };

function config(patch: Partial<ShippingConfig>): ShippingConfig {
  return {
    ...DEFAULT_SHIPPING,
    pickup: { ...DEFAULT_SHIPPING.pickup },
    presets: DEFAULT_SHIPPING.presets.map((preset) => ({ ...preset })),
    ...patch
  };
}

describe("mock carrier", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("selects the cheaper mock rate and does not call fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const carrier = createMockProvider("sekret");
    const check = await carrier.checkServiceability("560001", 350);
    expect(check.ok && check.data.serviceable).toBe(true);
    const rates = await carrier.getRates(query);
    expect(rates.ok).toBe(true);
    if (!rates.ok) return;
    const chosen = selectRate(rates.data);
    expect(chosen?.courierName).toBe("Mock Surface");
    expect(chosen?.ratePaise).toBe(4000 + 350 * 2);
    expect(await carrier.getRates({ ...query, pincode: "999999" })).toMatchObject({ ok: false, error: "Not serviceable" });
    const blocked = providerForEstimates(config({ provider: "shiprocket" }), "test");
    expect(blocked.configured).toBe(false);
    expect(await blocked.getRates(query)).toEqual({ ok: false, error: "Not configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("books, labels, and rejects a bad webhook token", async () => {
    const carrier = createMockProvider("sekret");
    const created = await carrier.createShipment({
      orderId: "ord_1",
      name: "Asha",
      phone: "9845012345",
      line1: "12 Church Street",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      weightGrams: 350,
      lengthMm: 160,
      widthMm: 120,
      heightMm: 50,
      paymentMode: "PREPAID",
      codPaise: 0,
      itemName: "NFC + QR combo",
      sku: "COMBO-NFC-QR",
      amountPaise: 149900
    });
    expect(created.ok).toBe(true);
    if (!created.ok || !created.data.awb) return;
    const label = await carrier.generateLabel(created.data.shipmentId);
    expect(label.ok && new TextDecoder().decode(label.data.bytes)).toContain(created.data.awb);
    expect(carrier.verifyWebhook("sekret")).toBe(true);
    expect(carrier.verifyWebhook("nope")).toBe(false);
    expect(carrier.verifyWebhook("")).toBe(false);
  });
});

describe("live carriers stay offline without keys", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call Shiprocket or Delhivery when credentials are empty", async () => {
    const fetchSpy = vi.fn<CarrierFetch>();
    const shiprocket = createShiprocket({
      email: "",
      password: "",
      pickupPincode: "560001",
      webhookSecret: "sekret",
      fetchImpl: fetchSpy
    });
    const delhivery = createDelhivery({ token: "", pickupPincode: "560001", webhookSecret: "sekret", fetchImpl: fetchSpy });
    expect(shiprocket.configured).toBe(false);
    expect(delhivery.configured).toBe(false);
    expect(await shiprocket.getRates(query)).toEqual({ ok: false, error: "Not configured" });
    expect(await delhivery.checkServiceability("560001", 350)).toEqual({ ok: false, error: "Not configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(adminCarrierState(config({ provider: "shiprocket" }), "production")).toBe("Not configured");
    expect(adminCarrierState(config({ provider: "mock" }), "production")).toBe("Not configured");
    expect(adminCarrierState(config({ provider: "mock" }), "development")).toBe("Mock carrier");
  });

  it("reuses a Shiprocket token from the injected client", async () => {
    const calls: string[] = [];
    const fetchImpl: CarrierFetch = async (url) => {
      calls.push(url);
      if (url.includes("/auth/login")) return { ok: true, status: 200, json: async () => ({ token: "cached-token" }) };
      if (url.includes("/courier/serviceability")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { available_courier_companies: [{ courier_company_id: 12, courier_name: "SR Surface", rate: 48, etd: "3 days" }] }
          })
        };
      }
      throw new Error(`unexpected ${url}`);
    };
    const carrier = createShiprocket({
      email: "ops@reviewqr.in",
      password: "secret",
      pickupPincode: "560001",
      webhookSecret: "sekret",
      fetchImpl,
      cache: { current: null }
    });
    const first = await carrier.getRates(query);
    const second = await carrier.getRates(query);
    expect(first.ok && first.data[0].ratePaise).toBe(4800);
    expect(second.ok).toBe(true);
    expect(calls.filter((url) => url.includes("/auth/login"))).toHaveLength(1);
    expect(calls.every((url) => url.startsWith("https://apiv2.shiprocket.in/"))).toBe(true);
    expect(selectRate(first.ok ? first.data : [])?.courierName).toBe("SR Surface");
  });

  it("refreshes an expired token and keeps a live one", () => {
    const now = Date.parse("2026-04-02T00:00:00Z");
    expect(readCachedToken({ token: "abc", expiresAt: now + 120_000 }, now)).toBe("abc");
    expect(readCachedToken({ token: "abc", expiresAt: now + 30_000 }, now)).toBeNull();
    expect(presetForWeight(DEFAULT_SHIPPING.presets, 300)?.id).toBe("stand");
  });
});

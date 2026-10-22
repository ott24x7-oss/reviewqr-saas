/**
 * QR24x7 shipping. The mock carrier is for development and tests.
 * Production never books with the mock, and an empty carrier config does not call the network.
 */
import { timingSafeEqualString } from "../timing-safe";
import { addressError, type AddressInput } from "./address";

export type ShippingProviderId = "mock" | "shiprocket" | "delhivery";

export type PickupAddress = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type PackagingPreset = {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightGrams: number;
};

export type ShippingConfig = {
  provider: ShippingProviderId;
  shiprocketEmail: string;
  shiprocketPassword: string;
  delhiveryToken: string;
  webhookSecret: string;
  pickup: PickupAddress;
  presets: PackagingPreset[];
};

export type Serviceability = {
  serviceable: boolean;
  etdDays: number | null;
  message: string;
};

export type ShippingRate = {
  courierId: string;
  courierName: string;
  ratePaise: number;
  etdDays: number;
};

export type RateQuery = {
  pincode: string;
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  paymentMode?: "PREPAID" | "COD";
};

export type ShipmentDraft = {
  orderId: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  paymentMode: "PREPAID" | "COD";
  codPaise: number;
  itemName: string;
  sku: string;
  amountPaise: number;
};

export type CreatedShipment = {
  shipmentId: string;
  awb: string | null;
  courierName: string | null;
};

export type LabelFile = {
  filename: string;
  bytes: Uint8Array;
  url?: string;
};

export type TrackingEvent = {
  at: string;
  status: string;
  detail: string;
};

export type Tracking = {
  awb: string;
  status: string;
  events: TrackingEvent[];
};

export type ShippingResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type CarrierResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
};

export type CarrierFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<CarrierResponse>;

export type ShippingProvider = {
  id: ShippingProviderId;
  configured: boolean;
  checkServiceability(pincode: string, weightGrams: number): Promise<ShippingResult<Serviceability>>;
  getRates(input: RateQuery): Promise<ShippingResult<ShippingRate[]>>;
  createShipment(draft: ShipmentDraft): Promise<ShippingResult<CreatedShipment>>;
  assignCourier(input: { shipmentId: string; courierId: string }): Promise<ShippingResult<{ awb: string; courierName: string }>>;
  generateLabel(shipmentId: string): Promise<ShippingResult<LabelFile>>;
  schedulePickup(input: { shipmentId: string; date: string }): Promise<ShippingResult<{ pickupId: string }>>;
  trackShipment(awb: string): Promise<ShippingResult<Tracking>>;
  cancelShipment(shipmentId: string): Promise<ShippingResult<{ cancelled: boolean }>>;
  verifyWebhook(token: string | null | undefined): boolean;
};

export const DEFAULT_PICKUP: PickupAddress = {
  name: "",
  phone: "",
  line1: "",
  city: "",
  state: "",
  pincode: ""
};

export const DEFAULT_PACKAGING_PRESETS: PackagingPreset[] = [
  { id: "mailer", name: "Mailer", lengthMm: 200, widthMm: 150, heightMm: 20, weightGrams: 50 },
  { id: "stand", name: "Table stand", lengthMm: 150, widthMm: 120, heightMm: 40, weightGrams: 300 },
  { id: "combo", name: "Combo box", lengthMm: 160, widthMm: 120, heightMm: 50, weightGrams: 350 }
];

export const DEFAULT_SHIPPING: ShippingConfig = {
  provider: "mock",
  shiprocketEmail: "",
  shiprocketPassword: "",
  delhiveryToken: "",
  webhookSecret: "",
  pickup: { ...DEFAULT_PICKUP },
  presets: DEFAULT_PACKAGING_PRESETS.map((preset) => ({ ...preset }))
};

const PRESET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function presetError(preset: PackagingPreset): string | null {
  if (!PRESET_ID.test(preset.id)) return "Preset id uses lowercase letters, digits, and hyphens";
  if (!preset.name.trim()) return "Preset name is required";
  const nums = [preset.lengthMm, preset.widthMm, preset.heightMm, preset.weightGrams];
  if (nums.some((n) => !Number.isInteger(n) || n <= 0)) return "Preset size and weight must be positive";
  return null;
}

export function pickupError(pickup: PickupAddress): string | null {
  const any = [pickup.name, pickup.phone, pickup.line1, pickup.city, pickup.state, pickup.pincode].some((value) => value.trim());
  if (!any) return null;
  return addressError(pickup as AddressInput);
}

export function selectRate(rates: ShippingRate[]): ShippingRate | null {
  if (!rates.length) return null;
  return [...rates].sort((a, b) => a.ratePaise - b.ratePaise || a.etdDays - b.etdDays)[0];
}

export function presetForWeight(presets: PackagingPreset[], grams: number): PackagingPreset | null {
  const usable = presets.filter((preset) => !presetError(preset));
  if (!usable.length) return null;
  const sorted = [...usable].sort((a, b) => a.weightGrams - b.weightGrams);
  return sorted.find((preset) => preset.weightGrams >= grams) ?? sorted[sorted.length - 1];
}

export type TokenCache = { token: string; expiresAt: number };

/** A token is reused until a minute before it expires. */
export function readCachedToken(cache: TokenCache | null | undefined, now: number, skewMs = 60_000): string | null {
  if (!cache?.token) return null;
  if (cache.expiresAt - skewMs <= now) return null;
  return cache.token;
}

export function webhookTokenOk(secret: string, presented: string | null | undefined) {
  if (!secret || !presented) return false;
  return timingSafeEqualString(secret, presented);
}

export function carrierConfigured(config: Pick<ShippingConfig, "provider" | "shiprocketEmail" | "shiprocketPassword" | "delhiveryToken">) {
  if (config.provider === "shiprocket") return Boolean(config.shiprocketEmail.trim() && config.shiprocketPassword);
  if (config.provider === "delhivery") return Boolean(config.delhiveryToken);
  return false;
}

/** What the admin screen should say. The mock is not a production carrier. */
export function adminCarrierState(config: ShippingConfig, nodeEnv: string | undefined): "Not configured" | "Mock carrier" | "Shiprocket" | "Delhivery" {
  if (config.provider === "mock") return nodeEnv === "production" ? "Not configured" : "Mock carrier";
  if (config.provider === "shiprocket" && carrierConfigured(config)) return "Shiprocket";
  if (config.provider === "delhivery" && carrierConfigured(config)) return "Delhivery";
  return "Not configured";
}

export function fromFetch(fetchImpl: typeof fetch): CarrierFetch {
  return async (url, init) => {
    const response = await fetchImpl(url, init);
    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json() as Promise<unknown>,
      text: () => response.text(),
      arrayBuffer: () => response.arrayBuffer()
    };
  };
}

const PINCODE = /^\d{6}$/;

export function createMockProvider(webhookSecret = ""): ShippingProvider {
  const shipments = new Map<string, { awb: string; courierId: string; courierName: string; cancelled: boolean; pincode: string }>();

  function serviceable(pincode: string, weightGrams: number): ShippingResult<Serviceability> {
    if (!PINCODE.test(pincode)) return { ok: true, data: { serviceable: false, etdDays: null, message: "Pincode must be 6 digits" } };
    if (!Number.isInteger(weightGrams) || weightGrams <= 0) {
      return { ok: false, error: "Weight must be a positive number of grams" };
    }
    if (pincode.startsWith("0") || pincode.startsWith("9")) {
      return { ok: true, data: { serviceable: false, etdDays: null, message: "Not serviceable" } };
    }
    return { ok: true, data: { serviceable: true, etdDays: 4, message: "Mock carrier can deliver" } };
  }

  return {
    id: "mock",
    configured: true,
    async checkServiceability(pincode, weightGrams) {
      return serviceable(pincode, weightGrams);
    },
    async getRates(input) {
      const check = serviceable(input.pincode, input.weightGrams);
      if (!check.ok) return check;
      if (!check.data.serviceable) return { ok: false, error: "Not serviceable" };
      const cod = input.paymentMode === "COD" ? 1500 : 0;
      const rates: ShippingRate[] = [
        { courierId: "mock-surface", courierName: "Mock Surface", ratePaise: 4000 + input.weightGrams * 2 + cod, etdDays: 5 },
        { courierId: "mock-air", courierName: "Mock Air", ratePaise: 9000 + input.weightGrams * 3 + cod, etdDays: 2 }
      ];
      return { ok: true, data: rates };
    },
    async createShipment(draft) {
      const check = serviceable(draft.pincode, draft.weightGrams);
      if (!check.ok) return check;
      if (!check.data.serviceable) return { ok: false, error: "Not serviceable" };
      const shipmentId = `mock_${draft.orderId}`;
      shipments.set(shipmentId, {
        awb: `MOCK${draft.pincode}`,
        courierId: "mock-surface",
        courierName: "Mock Surface",
        cancelled: false,
        pincode: draft.pincode
      });
      return { ok: true, data: { shipmentId, awb: `MOCK${draft.pincode}`, courierName: "Mock Surface" } };
    },
    async assignCourier(input) {
      const row = shipments.get(input.shipmentId);
      if (!row || row.cancelled) return { ok: false, error: "Shipment not found" };
      row.courierId = input.courierId;
      row.courierName = input.courierId === "mock-air" ? "Mock Air" : "Mock Surface";
      return { ok: true, data: { awb: row.awb, courierName: row.courierName } };
    },
    async generateLabel(shipmentId) {
      const row = shipments.get(shipmentId);
      if (!row || row.cancelled) return { ok: false, error: "Shipment not found" };
      return {
        ok: true,
        data: { filename: `${shipmentId}.txt`, bytes: new TextEncoder().encode(`MOCK LABEL ${row.awb}`) }
      };
    },
    async schedulePickup(input) {
      const row = shipments.get(input.shipmentId);
      if (!row || row.cancelled) return { ok: false, error: "Shipment not found" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pickup date must be YYYY-MM-DD" };
      return { ok: true, data: { pickupId: `pickup_${input.shipmentId}` } };
    },
    async trackShipment(awb) {
      const row = [...shipments.values()].find((item) => item.awb === awb);
      if (!row) return { ok: false, error: "Shipment not found" };
      return {
        ok: true,
        data: {
          awb,
          status: row.cancelled ? "Cancelled" : "In transit",
          events: [{ at: "2026-04-02T10:00:00.000Z", status: row.cancelled ? "Cancelled" : "In transit", detail: "Mock scan" }]
        }
      };
    },
    async cancelShipment(shipmentId) {
      const row = shipments.get(shipmentId);
      if (!row) return { ok: false, error: "Shipment not found" };
      row.cancelled = true;
      return { ok: true, data: { cancelled: true } };
    },
    verifyWebhook(token) {
      return webhookTokenOk(webhookSecret, token);
    }
  };
}

export function unconfiguredProvider(id: ShippingProviderId): ShippingProvider {
  const fail = async <T>(): Promise<ShippingResult<T>> => ({ ok: false, error: "Not configured" });
  return {
    id,
    configured: false,
    checkServiceability: fail,
    getRates: fail,
    createShipment: fail,
    assignCourier: fail,
    generateLabel: fail,
    schedulePickup: fail,
    trackShipment: fail,
    cancelShipment: fail,
    verifyWebhook: () => false
  };
}

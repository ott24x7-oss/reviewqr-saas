/**
 * Shiprocket adapter. Callers pass fetch. An empty login never touches the network.
 */
import {
  readCachedToken,
  webhookTokenOk,
  type CarrierFetch,
  type CreatedShipment,
  type LabelFile,
  type RateQuery,
  type ShipmentDraft,
  type ShippingProvider,
  type ShippingRate,
  type TokenCache
} from "./shipping";

export const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

type CacheBox = { current: TokenCache | null };

function notConfigured(): ShippingProvider {
  const fail = async () => ({ ok: false as const, error: "Not configured" });
  return {
    id: "shiprocket",
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function messageOf(body: unknown, fallback: string) {
  const record = asRecord(body);
  const message = record.message ?? record.error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function etdDays(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.round(value));
  const match = String(value ?? "").match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 5;
}

function rupeesToPaise(value: unknown) {
  const rupees = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

export function createShiprocket(opts: {
  email: string;
  password: string;
  pickupPincode: string;
  webhookSecret: string;
  fetchImpl: CarrierFetch;
  now?: () => number;
  cache?: CacheBox;
}): ShippingProvider {
  if (!opts.email.trim() || !opts.password) return notConfigured();
  const cache = opts.cache ?? { current: null };
  const now = opts.now ?? Date.now;

  async function request(path: string, init?: { method?: string; body?: string; token?: string }) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (init?.token) headers.authorization = `Bearer ${init.token}`;
    const response = await opts.fetchImpl(`${SHIPROCKET_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false as const, error: messageOf(body, "Shiprocket request failed"), body };
    return { ok: true as const, body };
  }

  async function token() {
    const cached = readCachedToken(cache.current, now());
    if (cached) return { ok: true as const, token: cached };
    const login = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: opts.email.trim(), password: opts.password })
    });
    if (!login.ok) return login;
    const value = asRecord(login.body).token;
    if (typeof value !== "string" || !value) return { ok: false as const, error: "Shiprocket did not return a token" };
    cache.current = { token: value, expiresAt: now() + TOKEN_TTL_MS };
    return { ok: true as const, token: value };
  }

  function ratesFrom(body: unknown): ShippingRate[] {
    const data = asRecord(asRecord(body).data);
    const companies = Array.isArray(data.available_courier_companies) ? data.available_courier_companies : [];
    const rates: ShippingRate[] = [];
    for (const company of companies) {
      const row = asRecord(company);
      const ratePaise = rupeesToPaise(row.rate);
      if (ratePaise == null) continue;
      rates.push({
        courierId: String(row.courier_company_id ?? ""),
        courierName: String(row.courier_name ?? "Shiprocket"),
        ratePaise,
        etdDays: etdDays(row.etd)
      });
    }
    return rates;
  }

  return {
    id: "shiprocket",
    configured: true,
    async checkServiceability(pincode, weightGrams) {
      const rates = await this.getRates({ pincode, weightGrams, paymentMode: "PREPAID" });
      if (!rates.ok) {
        if (rates.error === "Not serviceable") return { ok: true, data: { serviceable: false, etdDays: null, message: rates.error } };
        return { ok: false, error: rates.error };
      }
      const best = rates.data[0];
      return { ok: true, data: { serviceable: rates.data.length > 0, etdDays: best?.etdDays ?? null, message: rates.data.length ? "Serviceable" : "Not serviceable" } };
    },
    async getRates(input: RateQuery) {
      if (!/^\d{6}$/.test(input.pincode)) return { ok: false, error: "Pincode must be 6 digits" };
      if (!Number.isInteger(input.weightGrams) || input.weightGrams <= 0) return { ok: false, error: "Weight must be a positive number of grams" };
      const auth = await token();
      if (!auth.ok) return auth;
      const kg = Math.max(0.05, input.weightGrams / 1000);
      const cod = input.paymentMode === "COD" ? 1 : 0;
      const query = new URLSearchParams({
        pickup_postcode: opts.pickupPincode || "000000",
        delivery_postcode: input.pincode,
        weight: String(kg),
        cod: String(cod)
      });
      const response = await request(`/courier/serviceability/?${query.toString()}`, { token: auth.token });
      if (!response.ok) return { ok: false, error: response.error };
      const rates = ratesFrom(response.body);
      if (!rates.length) return { ok: false, error: "Not serviceable" };
      return { ok: true, data: rates };
    },
    async createShipment(draft: ShipmentDraft) {
      const auth = await token();
      if (!auth.ok) return auth;
      const kg = Math.max(0.05, draft.weightGrams / 1000);
      const response = await request("/orders/create/adhoc", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          order_id: draft.orderId,
          order_date: new Date().toISOString().slice(0, 10),
          pickup_location: "Primary",
          billing_customer_name: draft.name,
          billing_last_name: "",
          billing_address: draft.line1,
          billing_city: draft.city,
          billing_pincode: draft.pincode,
          billing_state: draft.state,
          billing_country: "India",
          billing_phone: draft.phone,
          shipping_is_billing: true,
          order_items: [{ name: draft.itemName, sku: draft.sku, units: 1, selling_price: draft.amountPaise / 100 }],
          payment_method: draft.paymentMode === "COD" ? "COD" : "Prepaid",
          sub_total: draft.amountPaise / 100,
          length: Math.max(1, Math.round(draft.lengthMm / 10)),
          breadth: Math.max(1, Math.round(draft.widthMm / 10)),
          height: Math.max(1, Math.round(draft.heightMm / 10)),
          weight: kg
        })
      });
      if (!response.ok) return { ok: false, error: response.error };
      const body = asRecord(response.body);
      const shipmentId = String(body.shipment_id ?? asRecord(body.payload).shipment_id ?? "");
      const awbValue = body.awb_code ?? asRecord(body.payload).awb_code;
      if (!shipmentId) return { ok: false, error: "Shiprocket did not return a shipment" };
      const created: CreatedShipment = {
        shipmentId,
        awb: typeof awbValue === "string" && awbValue ? awbValue : null,
        courierName: null
      };
      return { ok: true, data: created };
    },
    async assignCourier(input) {
      const auth = await token();
      if (!auth.ok) return auth;
      const response = await request("/courier/assign/awb", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({ shipment_id: input.shipmentId, courier_id: input.courierId })
      });
      if (!response.ok) return { ok: false, error: response.error };
      const data = asRecord(asRecord(response.body).response);
      const awb = data.awb_code ?? asRecord(response.body).awb_code;
      if (typeof awb !== "string" || !awb) return { ok: false, error: "Shiprocket did not return an AWB" };
      return { ok: true, data: { awb, courierName: String(data.courier_name ?? "Shiprocket") } };
    },
    async generateLabel(shipmentId) {
      const auth = await token();
      if (!auth.ok) return auth;
      const response = await request("/courier/generate/label", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({ shipment_id: [shipmentId] })
      });
      if (!response.ok) return { ok: false, error: response.error };
      const url = asRecord(response.body).label_url;
      if (typeof url !== "string" || !url.startsWith("https://")) return { ok: false, error: "Shiprocket did not return a label" };
      const file = await opts.fetchImpl(url);
      const buffer = file.arrayBuffer ? await file.arrayBuffer() : new ArrayBuffer(0);
      const label: LabelFile = { filename: `${shipmentId}.pdf`, bytes: new Uint8Array(buffer), url };
      return { ok: true, data: label };
    },
    async schedulePickup(input) {
      const auth = await token();
      if (!auth.ok) return auth;
      const response = await request("/courier/generate/pickup", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({ shipment_id: [input.shipmentId], pickup_date: [input.date] })
      });
      if (!response.ok) return { ok: false, error: response.error };
      const pickupId = asRecord(response.body).pickup_token_number ?? asRecord(response.body).response;
      return { ok: true, data: { pickupId: String(pickupId ?? input.shipmentId) } };
    },
    async trackShipment(awb) {
      const auth = await token();
      if (!auth.ok) return auth;
      const response = await request(`/courier/track/awb/${encodeURIComponent(awb)}`, { token: auth.token });
      if (!response.ok) return { ok: false, error: response.error };
      const nested = asRecord(asRecord(response.body).tracking_data);
      const tracks = Array.isArray(nested.shipment_track) ? nested.shipment_track : [];
      const track = asRecord(tracks[0]);
      const status = String(track.current_status ?? "In transit");
      return { ok: true, data: { awb, status, events: [{ at: new Date().toISOString(), status, detail: String(track.activity ?? status) }] } };
    },
    async cancelShipment(shipmentId) {
      const auth = await token();
      if (!auth.ok) return auth;
      const response = await request("/orders/cancel", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({ ids: [shipmentId] })
      });
      if (!response.ok) return { ok: false, error: response.error };
      return { ok: true, data: { cancelled: true } };
    },
    verifyWebhook(tokenValue) {
      return webhookTokenOk(opts.webhookSecret, tokenValue);
    }
  };
}

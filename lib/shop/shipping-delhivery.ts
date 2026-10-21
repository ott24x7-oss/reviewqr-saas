/**
 * Delhivery adapter. Callers pass fetch. An empty token never touches the network.
 */
import { webhookTokenOk, type CarrierFetch, type RateQuery, type ShipmentDraft, type ShippingProvider, type ShippingRate } from "./shipping";

export const DELHIVERY_BASE = "https://track.delhivery.com";

function notConfigured(): ShippingProvider {
  const fail = async () => ({ ok: false as const, error: "Not configured" });
  return {
    id: "delhivery",
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

function rupeesToPaise(value: unknown) {
  const rupees = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

export function createDelhivery(opts: { token: string; pickupPincode: string; webhookSecret: string; fetchImpl: CarrierFetch }): ShippingProvider {
  if (!opts.token) return notConfigured();

  async function request(path: string, init?: { method?: string; body?: string; contentType?: string }) {
    const response = await opts.fetchImpl(`${DELHIVERY_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        authorization: `Token ${opts.token}`,
        "content-type": init?.contentType ?? "application/json"
      },
      body: init?.body
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const record = asRecord(body);
      const message = typeof record.rmk === "string" ? record.rmk : "Delhivery request failed";
      return { ok: false as const, error: message };
    }
    return { ok: true as const, body };
  }

  function pinRecord(body: unknown) {
    const codes = asRecord(body).delivery_codes;
    if (!Array.isArray(codes) || !codes.length) return null;
    return asRecord(asRecord(codes[0]).postal_code);
  }

  return {
    id: "delhivery",
    configured: true,
    async checkServiceability(pincode, weightGrams) {
      if (!/^\d{6}$/.test(pincode)) return { ok: true, data: { serviceable: false, etdDays: null, message: "Pincode must be 6 digits" } };
      if (!Number.isInteger(weightGrams) || weightGrams <= 0) return { ok: false, error: "Weight must be a positive number of grams" };
      const response = await request(`/c/api/pin-codes/json/?filter_codes=${pincode}`);
      if (!response.ok) return response;
      const pin = pinRecord(response.body);
      const serviceable = pin?.pre_paid === "Y";
      return { ok: true, data: { serviceable, etdDays: serviceable ? 4 : null, message: serviceable ? "Serviceable" : "Not serviceable" } };
    },
    async getRates(input: RateQuery) {
      if (!/^\d{6}$/.test(input.pincode)) return { ok: false, error: "Pincode must be 6 digits" };
      if (!Number.isInteger(input.weightGrams) || input.weightGrams <= 0) return { ok: false, error: "Weight must be a positive number of grams" };
      const mode = input.paymentMode === "COD" ? "C" : "S";
      const query = new URLSearchParams({
        md: mode,
        ss: "Delivered",
        d_pin: input.pincode,
        o_pin: opts.pickupPincode || "000000",
        cgm: String(input.weightGrams)
      });
      const response = await request(`/api/kinko/v1/invoice/charges/.json?${query.toString()}`);
      if (!response.ok) return response;
      const row = Array.isArray(response.body) ? asRecord(response.body[0]) : asRecord(response.body);
      const ratePaise = rupeesToPaise(row.total_amount);
      if (ratePaise == null) return { ok: false, error: "Not serviceable" };
      const rates: ShippingRate[] = [{ courierId: "delhivery", courierName: "Delhivery", ratePaise, etdDays: 4 }];
      return { ok: true, data: rates };
    },
    async createShipment(draft: ShipmentDraft) {
      const payload = {
        shipments: [
          {
            name: draft.name,
            add: draft.line1,
            pin: draft.pincode,
            city: draft.city,
            state: draft.state,
            phone: draft.phone,
            order: draft.orderId,
            payment_mode: draft.paymentMode === "COD" ? "COD" : "Prepaid",
            cod_amount: draft.paymentMode === "COD" ? draft.codPaise / 100 : 0,
            weight: draft.weightGrams,
            shipment_length: Math.max(1, Math.round(draft.lengthMm / 10)),
            shipment_width: Math.max(1, Math.round(draft.widthMm / 10)),
            shipment_height: Math.max(1, Math.round(draft.heightMm / 10)),
            products_desc: draft.itemName
          }
        ],
        pickup_location: { name: "Primary" }
      };
      const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
      const response = await request("/api/cmu/create.json", {
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        body
      });
      if (!response.ok) return response;
      const packages = asRecord(response.body).packages;
      const first = Array.isArray(packages) ? asRecord(packages[0]) : {};
      const awb = typeof first.waybill === "string" ? first.waybill : "";
      if (!awb) return { ok: false, error: "Delhivery did not return an AWB" };
      return { ok: true, data: { shipmentId: awb, awb, courierName: "Delhivery" } };
    },
    async assignCourier(input) {
      return { ok: true, data: { awb: input.shipmentId, courierName: "Delhivery" } };
    },
    async generateLabel(shipmentId) {
      const response = await opts.fetchImpl(`${DELHIVERY_BASE}/api/p/packing_slip?wbns=${encodeURIComponent(shipmentId)}&pdf=true`, {
        headers: { authorization: `Token ${opts.token}` }
      });
      if (!response.ok) return { ok: false, error: "Delhivery did not return a label" };
      const buffer = response.arrayBuffer ? await response.arrayBuffer() : new ArrayBuffer(0);
      return { ok: true, data: { filename: `${shipmentId}.pdf`, bytes: new Uint8Array(buffer) } };
    },
    async schedulePickup(input) {
      const response = await request("/fm/request/new/", {
        method: "POST",
        body: JSON.stringify({ pickup_date: input.date, pickup_time: "11:00:00", expected_package_count: 1 })
      });
      if (!response.ok) return response;
      const pickupId = asRecord(response.body).pickup_id ?? input.shipmentId;
      return { ok: true, data: { pickupId: String(pickupId) } };
    },
    async trackShipment(awb) {
      const response = await request(`/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}`);
      if (!response.ok) return response;
      const shipmentData = asRecord(response.body).ShipmentData;
      const first = Array.isArray(shipmentData) ? asRecord(asRecord(shipmentData[0]).Shipment) : {};
      const status = asRecord(first.Status);
      const label = String(status.Status ?? "In transit");
      return {
        ok: true,
        data: {
          awb,
          status: label,
          events: [{ at: String(status.StatusDateTime ?? new Date().toISOString()), status: label, detail: String(status.Instructions ?? label) }]
        }
      };
    },
    async cancelShipment(shipmentId) {
      const response = await request("/api/p/edit", {
        method: "POST",
        body: JSON.stringify({ waybill: shipmentId, cancellation: true })
      });
      if (!response.ok) return response;
      return { ok: true, data: { cancelled: true } };
    },
    verifyWebhook(token) {
      return webhookTokenOk(opts.webhookSecret, token);
    }
  };
}

import { selectRate, type ShippingProvider } from "./shipping";

export async function deliveryEstimate(provider: ShippingProvider, pincode: string, weightGrams: number) {
  if (weightGrams === 0) {
    return { ok: true as const, serviceable: true, etdDays: 0, ratePaise: 0, courierName: null as string | null, message: "No shipping" };
  }
  if (!provider.configured) return { ok: false as const, error: "Not configured" };
  const check = await provider.checkServiceability(pincode, weightGrams);
  if (!check.ok) return check;
  if (!check.data.serviceable) {
    return { ok: true as const, serviceable: false, etdDays: null, ratePaise: null, courierName: null, message: check.data.message || "Not serviceable" };
  }
  const rates = await provider.getRates({ pincode, weightGrams, paymentMode: "PREPAID" });
  if (!rates.ok) return { ok: true as const, serviceable: false, etdDays: null, ratePaise: null, courierName: null, message: rates.error };
  const chosen = selectRate(rates.data);
  return {
    ok: true as const,
    serviceable: true,
    etdDays: chosen?.etdDays ?? check.data.etdDays,
    ratePaise: chosen?.ratePaise ?? null,
    courierName: chosen?.courierName ?? null,
    message: check.data.message
  };
}

import { storeSettingsSchema } from "@reviewqr/shared";
import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { WEEK_DAYS, type WeekHours } from "../tap/hours";
import { normalizeUpiId } from "./upi";
import { requireBusinessRole } from "../tenant";
import { moduleBlock } from "../plans/entitlements";

function paise(rupees: number) {
  return Math.max(0, Math.round(rupees * 100));
}

function rupees(value: number) {
  return value / 100;
}

const defaults = {
  holiday: false,
  hours: {} as WeekHours,
  dineIn: true,
  takeaway: true,
  delivery: false,
  deliveryPincodes: "",
  deliveryChargeRupees: 0,
  freeDeliveryAboveRupees: null as number | null,
  minOrderRupees: 0,
  packingChargeRupees: 0,
  gstEnabled: false,
  gstPercent: 5,
  pricesIncludeGst: true,
  prepMinutes: 20,
  upiId: "",
  layout: "AUTO" as const,
  design: "CLASSIC" as const
};

export async function readStoreSettings(userId: string, businessId: string) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  const locked = await moduleBlock(business.ownerId, "STORE");
  if (locked) return fail(403, locked);
  const row = await prisma.storeSettings.findUnique({ where: { businessId: business.id } });
  if (!row) return ok(defaults);
  const hours = row.hours && typeof row.hours === "object" && !Array.isArray(row.hours) ? (row.hours as WeekHours) : {};
  return ok({
    holiday: row.holiday,
    hours,
    dineIn: row.dineIn,
    takeaway: row.takeaway,
    delivery: row.delivery,
    deliveryPincodes: row.deliveryPincodes,
    deliveryChargeRupees: rupees(row.deliveryChargePaise),
    freeDeliveryAboveRupees: row.freeDeliveryAbovePaise == null ? null : rupees(row.freeDeliveryAbovePaise),
    minOrderRupees: rupees(row.minOrderPaise),
    packingChargeRupees: rupees(row.packingChargePaise),
    gstEnabled: row.gstEnabled,
    gstPercent: row.gstPercent,
    pricesIncludeGst: row.pricesIncludeGst,
    prepMinutes: row.prepMinutes,
    upiId: row.upiId,
    layout: row.layout,
    design: row.design
  });
}

export async function saveStoreSettings(userId: string, businessId: string, raw: unknown) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const locked = await moduleBlock(business.ownerId, "STORE");
  if (locked) return fail(403, locked);
  const parsed = storeSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message || "Invalid store settings");
  }
  const data = parsed.data;
  if (!data.dineIn && !data.takeaway && !data.delivery) {
    return fail(400, "Turn on at least one order type");
  }
  const hours: WeekHours = {};
  for (const key of WEEK_DAYS) {
    const row = data.hours[key];
    if (row) hours[key] = row;
  }
  const upiId = normalizeUpiId(data.upiId || "");
  if (upiId == null) return fail(400, "Enter a UPI ID like name@bank");
  const saved = {
    holiday: data.holiday,
    hours,
    dineIn: data.dineIn,
    takeaway: data.takeaway,
    delivery: data.delivery,
    deliveryPincodes: data.deliveryPincodes.trim().slice(0, 400),
    deliveryChargePaise: paise(data.deliveryChargeRupees),
    freeDeliveryAbovePaise: data.freeDeliveryAboveRupees == null ? null : paise(data.freeDeliveryAboveRupees),
    minOrderPaise: paise(data.minOrderRupees),
    packingChargePaise: paise(data.packingChargeRupees),
    gstEnabled: data.gstEnabled,
    gstPercent: data.gstPercent,
    pricesIncludeGst: data.pricesIncludeGst,
    prepMinutes: data.prepMinutes,
    upiId,
    layout: data.layout,
    design: data.design
  };
  await prisma.storeSettings.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...saved },
    update: saved
  });
  return ok({ ok: true as const });
}

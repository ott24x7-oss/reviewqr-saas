import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { WEEK_DAYS, type WeekHours } from "@/lib/tap/hours";
import { normalizeUpiId } from "@/lib/store/upi";

const day = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
}).nullable();

const schema = z.object({
  holiday: z.boolean(),
  hours: z.object({
    sun: day, mon: day, tue: day, wed: day, thu: day, fri: day, sat: day
  }),
  dineIn: z.boolean(),
  takeaway: z.boolean(),
  delivery: z.boolean(),
  deliveryPincodes: z.string().max(400),
  deliveryChargeRupees: z.number().min(0).max(100000),
  freeDeliveryAboveRupees: z.number().min(0).max(100000).nullable(),
  minOrderRupees: z.number().min(0).max(100000),
  packingChargeRupees: z.number().min(0).max(100000),
  gstEnabled: z.boolean(),
  gstPercent: z.number().int().min(0).max(28),
  pricesIncludeGst: z.boolean(),
  prepMinutes: z.number().int().min(1).max(240),
  upiId: z.string().max(80).optional(),
  layout: z.enum(["AUTO", "FOOD", "SHOP", "SERVICES"])
});

function paise(rupees: number) {
  return Math.max(0, Math.round(rupees * 100));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid store settings" }, { status: 400 });
  }
  const data = parsed.data;
  if (!data.dineIn && !data.takeaway && !data.delivery) {
    return NextResponse.json({ error: "Turn on at least one order type" }, { status: 400 });
  }
  const hours: WeekHours = {};
  for (const key of WEEK_DAYS) {
    const row = data.hours[key];
    if (row) hours[key] = row;
  }
  const upiId = normalizeUpiId(data.upiId || "");
  if (upiId == null) {
    return NextResponse.json({ error: "Enter a UPI ID like name@bank" }, { status: 400 });
  }
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
    layout: data.layout
  };
  await prisma.storeSettings.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...saved },
    update: saved
  });
  return NextResponse.json({ ok: true });
}

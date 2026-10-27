import {
  bookingDateLabel,
  bookingTimeLabel,
  bookingWhatsAppText,
  publicBookingSchema
} from "@reviewqr/shared";
import { isBotUserAgent } from "../analytics/bots";
import { addIstDays, istDayKey } from "../analytics/ist";
import { prisma } from "../db";
import { featureBlock } from "../plans/feature-gate";
import { rateLimitDb } from "../rate-limit";
import { whatsAppNumberUrl } from "../tap/links";
import { fail, ok, type ServiceResult } from "../api/result";
import { BOOKING_BUSINESS_LIMIT, BOOKING_LIMIT, bookingBusinessRateKey, bookingRateKeys } from "./limits";
import { notifyNewBooking } from "./order-alert";
import { consentedPhone } from "./order-status";

export type PublicBookingResult = {
  id: string;
  whatsappUrl: string | null;
  ignored?: boolean;
};

function dateOk(iso: string, now: Date) {
  const today = istDayKey(now);
  return iso >= today && iso <= addIstDays(today, 90);
}

export async function createPublicBooking(input: {
  raw: unknown;
  ip: string;
  userAgent: string | null;
  now?: Date;
}): Promise<ServiceResult<PublicBookingResult>> {
  if (isBotUserAgent(input.userAgent)) return ok({ id: "", whatsappUrl: null, ignored: true });
  const parsed = publicBookingSchema.safeParse(input.raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid booking");
  const data = parsed.data;
  const now = input.now ?? new Date();
  if (!dateOk(data.preferredDate, now)) return fail(400, "Choose a date from today");

  const ipLimit = await rateLimitDb({ key: bookingRateKeys(input.ip, "pending")[0], ...BOOKING_LIMIT });
  if (!ipLimit.ok) return fail(429, "Too many requests");

  const savedPhone = consentedPhone(data.customerPhone, data.consent, now);
  if (!savedPhone.customerPhone || !savedPhone.consentAt) {
    return fail(400, "Consent is required to save the phone");
  }
  const phoneLimit = await rateLimitDb({
    key: bookingRateKeys(input.ip, savedPhone.customerPhone)[1],
    ...BOOKING_LIMIT
  });
  if (!phoneLimit.ok) return fail(429, "Too many requests");

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: data.code },
    include: { business: { select: { id: true, name: true, ownerId: true, whatsappNumber: true, isActive: true, archived: true } } }
  });
  if (!qr?.business || qr.status !== "ACTIVE" || !qr.business.isActive || qr.business.archived) {
    return fail(404, "This page is not available");
  }
  const businessLimit = await rateLimitDb({
    key: bookingBusinessRateKey(qr.business.id),
    ...BOOKING_BUSINESS_LIMIT
  });
  if (!businessLimit.ok) return fail(429, "Too many requests");
  const locked = await featureBlock(qr.business.ownerId, "services-booking");
  if (locked) return locked;

  const item = await prisma.menuItem.findFirst({
    where: { id: data.itemId, businessId: qr.business.id, available: true, kind: "SERVICE", bookable: true },
    include: { variants: true }
  });
  if (!item) return fail(400, "This service is not available");
  const variant = data.variantId ? item.variants.find((row) => row.id === data.variantId && row.inStock) : null;
  if (data.variantId && !variant) return fail(400, "Choose an available option");

  const lang = data.lang === "hi" ? "hi" : "en";
  const serviceName = lang === "hi" && item.nameHi ? item.nameHi : item.name;
  const optionLabel = variant ? (lang === "hi" && variant.labelHi ? variant.labelHi : variant.label) : "";
  const today = istDayKey(now);
  const dateLabel = bookingDateLabel(data.preferredDate, lang, today, addIstDays(today, 1));
  const timeLabel = bookingTimeLabel(data.preferredSlot, data.preferredTime, lang);
  const text = bookingWhatsAppText({
    businessName: qr.business.name,
    serviceName,
    optionLabel,
    dateLabel,
    timeLabel,
    customerName: data.customerName.trim(),
    lang
  });
  const base = whatsAppNumberUrl(qr.business.whatsappNumber);
  let whatsappUrl: string | null = null;
  if (base) {
    const url = new URL(base);
    url.searchParams.set("text", text.slice(0, 900));
    whatsappUrl = url.toString();
  }

  const booking = await prisma.bookingRequest.create({
    data: {
      businessId: qr.business.id,
      itemId: item.id,
      variantId: variant?.id || null,
      customerName: data.customerName.trim(),
      customerPhone: savedPhone.customerPhone,
      consentAt: savedPhone.consentAt,
      preferredDate: data.preferredDate,
      preferredSlot: data.preferredSlot || null,
      preferredTime: data.preferredTime || null,
      note: (data.note || "").trim().slice(0, 400) || null,
      source: data.source || "link",
      lang,
      status: "NEW"
    }
  });

  try {
    await prisma.contact.upsert({
      where: { businessId_phone: { businessId: qr.business.id, phone: savedPhone.customerPhone } },
      create: {
        businessId: qr.business.id,
        phone: savedPhone.customerPhone,
        name: data.customerName.trim(),
        source: "booking"
      },
      update: { name: data.customerName.trim() }
    });
  } catch (err) {
    console.error("[bookings] contact failed", err);
  }

  try {
    await notifyNewBooking({
      businessId: qr.business.id,
      ownerId: qr.business.ownerId,
      businessName: qr.business.name,
      serviceName: item.name,
      customerName: data.customerName.trim(),
      bookingId: booking.id
    });
  } catch (err) {
    console.error("[bookings] notify failed", err);
  }

  return ok({ id: booking.id, whatsappUrl });
}

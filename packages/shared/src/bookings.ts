import { z } from "zod";

export const catalogModeSchema = z.enum(["MENU", "SERVICES", "BOTH"]);
export const menuItemKindSchema = z.enum(["PRODUCT", "SERVICE"]);
export const priceTypeSchema = z.enum(["FIXED", "FROM", "ON_REQUEST"]);
export const bookingStatusSchema = z.enum(["NEW", "CONFIRMED", "DONE", "CANCELLED", "NO_SHOW"]);
export const bookingSlotSchema = z.enum(["MORNING", "AFTERNOON", "EVENING"]);

export type CatalogMode = z.infer<typeof catalogModeSchema>;
export type MenuItemKind = z.infer<typeof menuItemKindSchema>;
export type PriceType = z.infer<typeof priceTypeSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type BookingSlot = z.infer<typeof bookingSlotSchema>;

const serviceFields = {
  itemKind: menuItemKindSchema.optional(),
  priceType: priceTypeSchema.optional(),
  bookable: z.boolean().optional()
};

export const serviceItemFieldsSchema = z.object(serviceFields);

/** Fifteen-minute steps from 15 minutes through 8 hours. */
export const DURATION_STEPS = Array.from({ length: 32 }, (_, index) => (index + 1) * 15);

export function formatDuration(minutes: number | null | undefined, lang: "en" | "hi" = "en") {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (lang === "hi") {
    if (hours === 0) return `${rest} मिनट`;
    if (rest === 0) return hours === 1 ? "1 घंटा" : `${hours} घंटे`;
    return `${hours} घंटा, ${rest} मिनट`;
  }
  if (hours === 0) return `${rest} min`;
  const hourLabel = hours === 1 ? "1 hr" : `${hours} hrs`;
  if (rest === 0) return hourLabel;
  return `${hourLabel}, ${rest} min`;
}

export function formatServicePrice(input: {
  pricePaise: number;
  priceType?: PriceType | null;
  lang?: "en" | "hi";
}) {
  const lang = input.lang === "hi" ? "hi" : "en";
  if (input.priceType === "ON_REQUEST") return lang === "hi" ? "कीमत पूछें" : "Price on request";
  const rupees = input.pricePaise / 100;
  const body = Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
  const amount = `₹${body}`;
  if (input.priceType === "FROM") return lang === "hi" ? `${amount} से` : `from ${amount}`;
  return amount;
}

export function bookingDateLabel(iso: string, lang: "en" | "hi", today: string, tomorrow: string) {
  if (iso === today) return lang === "hi" ? "आज" : "Today";
  if (iso === tomorrow) return lang === "hi" ? "कल" : "Tomorrow";
  return iso;
}

export function bookingTimeLabel(slot: string | null | undefined, time: string | null | undefined, lang: "en" | "hi") {
  if (time) return time;
  if (slot === "MORNING") return lang === "hi" ? "सुबह" : "Morning";
  if (slot === "AFTERNOON") return lang === "hi" ? "दोपहर" : "Afternoon";
  if (slot === "EVENING") return lang === "hi" ? "शाम" : "Evening";
  return "";
}

export function bookingWhatsAppText(input: {
  businessName: string;
  serviceName: string;
  optionLabel?: string | null;
  dateLabel: string;
  timeLabel: string;
  customerName: string;
  lang?: "en" | "hi";
}) {
  const option = input.optionLabel ? ` (${input.optionLabel})` : "";
  if (input.lang === "hi") {
    return `नमस्ते ${input.businessName}, मैं ${input.serviceName}${option} बुक करना चाहता हूँ – ${input.dateLabel}, ${input.timeLabel}. नाम: ${input.customerName}.`;
  }
  return `Hi ${input.businessName}, I'd like to book ${input.serviceName}${option} – ${input.dateLabel}, ${input.timeLabel}. Name: ${input.customerName}.`;
}

export const BOOKING_STATUSES = bookingStatusSchema.options;

export function bookingStatusLabel(status: BookingStatus, lang: "en" | "hi" = "en") {
  const en: Record<BookingStatus, string> = {
    NEW: "New",
    CONFIRMED: "Confirmed",
    DONE: "Done",
    CANCELLED: "Cancelled",
    NO_SHOW: "No show"
  };
  const hi: Record<BookingStatus, string> = {
    NEW: "नया",
    CONFIRMED: "पुष्ट",
    DONE: "हो गया",
    CANCELLED: "रद्द",
    NO_SHOW: "नहीं आए"
  };
  return (lang === "hi" ? hi : en)[status];
}

/** Phase 1 accepts every known status after every other. An unknown value is refused. */
export function applyBookingStatus(current: string, next: string): BookingStatus | null {
  if (!bookingStatusSchema.safeParse(current).success) return null;
  const parsed = bookingStatusSchema.safeParse(next);
  return parsed.success ? parsed.data : null;
}

export const publicBookingBodySchema = z.object({
  code: z.string().min(4).max(32),
  itemId: z.string().min(1).max(40),
  variantId: z.string().max(40).optional(),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().max(20),
  consent: z.literal(true),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredSlot: bookingSlotSchema.optional(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  note: z.string().max(400).optional(),
  lang: z.enum(["en", "hi"]).optional(),
  source: z.enum(["qr", "nfc", "link"]).optional()
});

export const publicBookingSchema = publicBookingBodySchema.refine(
  (data) => Boolean(data.preferredSlot || data.preferredTime),
  { message: "Choose a time" }
);

export const bookingStatusPatchSchema = z.object({
  status: bookingStatusSchema
});

export const bookingCardSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  businessName: z.string(),
  itemId: z.string(),
  serviceName: z.string(),
  optionLabel: z.string(),
  customerName: z.string(),
  phone: z.string().nullable(),
  preferredDate: z.string(),
  preferredSlot: z.string().nullable(),
  preferredTime: z.string().nullable(),
  timeLabel: z.string(),
  note: z.string(),
  status: bookingStatusSchema,
  source: z.string().nullable(),
  canManage: z.boolean(),
  callUrl: z.string().nullable(),
  whatsAppUrl: z.string().nullable(),
  createdAt: z.string()
});

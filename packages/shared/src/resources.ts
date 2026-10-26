import { z } from "zod";

const veg = z.enum(["VEG", "NON_VEG", "EGG", "NONE"]);

export const menuActionSchema = z.object({
  action: z.enum([
    "category",
    "item",
    "update",
    "delete",
    "template",
    "items",
    "variant",
    "variant-update",
    "variant-delete",
    "addon",
    "addon-update",
    "addon-delete",
    "bulk-price",
    "duplicate",
    "category-rename",
    "category-reorder"
  ]),
  id: z.string().optional(),
  ids: z.array(z.string()).max(40).optional(),
  kind: z.enum(["item", "category", "variant"]).optional(),
  name: z.string().max(80).optional(),
  nameHi: z.string().max(80).optional(),
  priceRupees: z.number().min(0).max(100000).optional(),
  mrpRupees: z.number().min(0).max(100000).nullable().optional(),
  description: z.string().max(200).optional(),
  bestseller: z.boolean().optional(),
  veg: veg.optional(),
  categoryId: z.string().nullable().optional(),
  available: z.boolean().optional(),
  photo: z.string().max(1_500_000).optional(),
  photos: z.array(z.string().max(1_500_000)).max(5).optional(),
  brand: z.string().max(40).optional(),
  durationMinutes: z.number().int().min(1).max(480).nullable().optional(),
  itemKind: z.enum(["PRODUCT", "SERVICE"]).optional(),
  priceType: z.enum(["FIXED", "FROM", "ON_REQUEST"]).optional(),
  bookable: z.boolean().optional(),
  barcode: z.string().max(64).optional(),
  category: z.string().max(80).optional(),
  templateId: z.enum(["cafe", "restaurant", "mobile", "clothing", "kirana", "salon", "spa", "clinic", "gym", "tutor"]).optional(),
  size: z.string().max(40).optional(),
  colour: z.string().max(40).optional(),
  inStock: z.boolean().optional(),
  mode: z.enum(["percent", "rupees"]).optional(),
  amount: z.number().finite().min(-100000).max(100000).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        priceRupees: z.number().min(0).max(100000),
        veg: veg.optional(),
        category: z.string().max(80).optional(),
        nameHi: z.string().max(80).optional(),
        description: z.string().max(200).optional(),
        brand: z.string().max(40).optional(),
        mrpRupees: z.number().min(0).max(100000).nullable().optional(),
        colour: z.string().max(40).optional(),
        photo: z.string().max(1_500_000).optional(),
        barcode: z.string().max(64).optional(),
        durationMinutes: z.number().int().min(1).max(480).nullable().optional(),
        itemKind: z.enum(["PRODUCT", "SERVICE"]).optional(),
        priceType: z.enum(["FIXED", "FROM", "ON_REQUEST"]).optional(),
        bookable: z.boolean().optional()
      })
    )
    .max(50)
    .optional()
});

const day = z
  .object({
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  })
  .nullable();

export const storeSettingsSchema = z.object({
  holiday: z.boolean(),
  hours: z.object({
    sun: day,
    mon: day,
    tue: day,
    wed: day,
    thu: day,
    fri: day,
    sat: day
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
  layout: z.enum(["AUTO", "FOOD", "SHOP", "SERVICES"]),
  design: z.enum(["CLASSIC", "PREMIUM", "MINIMAL", "BOLD"])
});

export const offerActionSchema = z.object({
  action: z.enum(["coupon", "coupon-update", "coupon-delete", "banner", "banner-update", "banner-delete"]),
  id: z.string().optional(),
  code: z.string().max(24).optional(),
  kind: z.enum(["PERCENT", "FLAT"]).optional(),
  amount: z.number().min(0).max(100000).optional(),
  minRupees: z.number().min(0).max(100000).optional(),
  expiresOn: z.string().max(10).nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().optional(),
  title: z.string().max(80).optional(),
  body: z.string().max(160).optional()
});

export const orderStatusSchema = z.object({
  status: z.enum(["NEW", "ACCEPTED", "REJECTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"])
});

export const feedbackPatchSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"]).optional(),
  internalNote: z.string().max(1000).optional(),
  eraseContact: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional()
});

export const testimonialVisibilitySchema = z.object({
  id: z.string().min(1),
  isPublic: z.boolean()
});

export const hintCreateSchema = z.object({
  content: z.string().trim().min(2).max(280)
});

export const locationCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80).optional()
});

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  template: z.string().trim().min(2).max(1000)
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  services: z.string().max(500)
});

export const staffRenameSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const staffInviteSchema = z.object({
  email: z.string().trim().email().max(160)
});

export const agentOnboardSchema = z.object({
  phone: z.string().min(10).max(20),
  businessName: z.string().trim().min(2).max(80)
});

export const themeActionSchema = z.object({
  action: z.enum(["save", "reset", "duplicate"]).default("save"),
  themeId: z.string().min(1).max(40).optional(),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  buttonBg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  buttonInk: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font: z.string().optional(),
  buttons: z.enum(["filled", "outline", "soft", "glass", "pill", "square", "raised"]).optional(),
  avatar: z.enum(["circle", "rounded", "square"]).optional(),
  entrance: z.enum(["none", "fade", "rise"]).optional(),
  radius: z.enum(["0px", "12px", "16px", "24px", "999px"]).optional(),
  backgroundType: z.enum(["preset", "solid", "gradient", "image", "pattern", "video"]).optional(),
  backgroundTo: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  imageUrl: z.string().max(400).optional().or(z.literal("")),
  video: z.string().max(400).optional().or(z.literal("")),
  seasonalFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  seasonalTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  duplicateName: z.string().max(40).optional()
});

export const qrClaimSchema = z.object({
  code: z.string().min(4).max(500),
  confirm: z.boolean().optional(),
  label: z.string().max(80).optional()
});

export const qrPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("label"), code: z.string(), label: z.string().min(1).max(80) }),
  z.object({ action: z.literal("location"), code: z.string(), locationId: z.string().nullable() }),
  z.object({
    action: z.literal("direct"),
    code: z.string(),
    mode: z.enum(["INHERIT", "TAP_PAGE", "DIRECT"]),
    target: z.string().max(40).optional()
  }),
  z.object({
    action: z.enum(["disable", "enable"]),
    codes: z.array(z.string()).min(1).max(100)
  })
]);

export const notificationReadSchema = z.object({
  id: z.string().min(1).max(64).optional()
});

export const pageQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional()
});

export const menuResultSchema = z.object({
  ok: z.literal(true),
  message: z.string().optional(),
  added: z.number().optional(),
  variantId: z.string().optional()
});

export const uploadResultSchema = z.object({
  url: z.string(),
  thumbUrl: z.string(),
  originalUrl: z.string(),
  storage: z.enum(["s3", "data-url"])
});

export const orderCardSchema = z.object({
  id: z.string(),
  number: z.string(),
  businessName: z.string(),
  status: orderStatusSchema.shape.status,
  canManage: z.boolean(),
  createdAt: z.string(),
  customerName: z.string(),
  place: z.string(),
  note: z.string(),
  orderType: z.string(),
  pincode: z.string(),
  payment: z.string(),
  totalPaise: z.number(),
  items: z.array(z.object({ name: z.string(), qty: z.number(), note: z.string() })),
  phone: z.string().nullable(),
  lang: z.enum(["en", "hi"]),
  whatsAppUrl: z.string().nullable()
});

export const daySummarySchema = z.object({
  count: z.number().int(),
  totalPaise: z.number().int()
});

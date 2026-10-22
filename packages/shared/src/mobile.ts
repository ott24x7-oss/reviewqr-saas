import { z } from "zod";

export const dashboardSchema = z.object({
  ordersToday: z.number().int(),
  feedbackToday: z.number().int(),
  scansToday: z.number().int(),
  businessId: z.string().nullable(),
  plan: z.object({
    tier: z.string(),
    status: z.string(),
    trialEndsAt: z.string().nullable(),
    subscriptionEndsAt: z.string().nullable()
  })
});

export const placePredictionSchema = z.object({
  placeId: z.string(),
  description: z.string()
});

export const placesSearchSchema = z.object({
  enabled: z.boolean(),
  predictions: z.array(placePredictionSchema)
});

export const placeDetailsSchema = z.object({
  enabled: z.boolean(),
  place: z
    .object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      city: z.string(),
      googlePlaceId: z.string(),
      googleReviewUrl: z.string()
    })
    .nullable()
});

export const tapLinkSchema = z
  .object({
    key: z.string(),
    type: z.string(),
    labelEn: z.string(),
    labelHi: z.string(),
    enabled: z.boolean(),
    url: z.string(),
    emoji: z.string().optional(),
    featured: z.boolean().optional(),
    schedule: z.object({ from: z.string(), to: z.string() }).nullable().optional()
  })
  .passthrough();

export const tapThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  premium: z.boolean()
});

export const tapPageSchema = z.object({
  code: z.string().nullable(),
  publicPath: z.string().nullable(),
  tapUrl: z.string().nullable(),
  bio: z.string(),
  bioHi: z.string(),
  themeId: z.string(),
  links: z.array(tapLinkSchema),
  themes: z.array(tapThemeSchema)
});

export const menuSnapRequestSchema = z.object({
  image: z.string().min(32).max(6_000_000)
});

export const productDraftSchema = z
  .object({
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    veg: z.string().optional(),
    brand: z.string().optional(),
    colour: z.string().optional(),
    durationMinutes: z.number().nullable().optional()
  })
  .passthrough();

export const tapSaveSchema = z.object({
  action: z.enum(["draft", "publish"]),
  bio: z.string().max(800).optional(),
  bioHi: z.string().max(800).optional(),
  hours: z.unknown().optional(),
  links: z.array(z.unknown()).max(40),
  gallery: z.array(z.string().max(500)).max(8).optional(),
  themeId: z.string().min(1).max(40).optional()
});

export const shopOrderDetailSchema = z.object({
  id: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  paymentStatus: z.string(),
  totalPaise: z.number().int(),
  invoiceNumber: z.string().nullable(),
  checkoutUrl: z.string().nullable(),
  createdAt: z.string(),
  lines: z.array(z.object({ sku: z.string(), name: z.string(), qty: z.number().int(), unitPaise: z.number().int() })),
  timeline: z.array(z.object({ label: z.string(), at: z.string() })),
  reprints: z.array(z.object({ id: z.string(), reason: z.string(), status: z.string(), createdAt: z.string() }))
});

export const billingSummarySchema = z.object({
  plan: z.object({
    tier: z.string(),
    status: z.string(),
    trialEndsAt: z.string().nullable(),
    subscriptionEndsAt: z.string().nullable()
  }),
  history: z.array(
    z.object({
      id: z.string(),
      amountPaise: z.number().int(),
      currency: z.string(),
      status: z.string(),
      tier: z.string(),
      invoiceNumber: z.string().nullable(),
      createdAt: z.string()
    })
  )
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type ShopOrderDetail = z.infer<typeof shopOrderDetailSchema>;
export type BillingSummary = z.infer<typeof billingSummarySchema>;
export type PlacesSearch = z.infer<typeof placesSearchSchema>;
export type PlaceDetails = z.infer<typeof placeDetailsSchema>;
export type TapPage = z.infer<typeof tapPageSchema>;
export type TapLink = z.infer<typeof tapLinkSchema>;

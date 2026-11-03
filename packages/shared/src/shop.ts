import { z } from "zod";

export const shopDesignSchema = z.object({
  templateId: z.string().min(1).max(40),
  businessId: z.string().min(1).max(40),
  qrShortCode: z.string().max(40).nullable().optional(),
  deviceId: z.string().max(40).nullable().optional(),
  headline: z.string().max(80).nullable().optional()
});

export const shopCartLineSchema = z.object({
  sku: z.string().min(1).max(40),
  qty: z.number().int().min(1).max(99),
  design: shopDesignSchema.nullable().optional()
});

export const shopCartPutSchema = z.object({
  businessId: z.string().max(40).nullable().optional(),
  couponCode: z.string().max(40).nullable().optional(),
  referralCode: z.string().max(40).nullable().optional(),
  buyerGstin: z.string().max(15).nullable().optional(),
  buyerLegalName: z.string().max(120).nullable().optional(),
  addressId: z.string().max(40).nullable().optional(),
  lines: z.array(shopCartLineSchema).max(20).optional()
});

export const shopCartItemSchema = z.object({
  sku: z.string().min(1).max(40),
  qty: z.number().int().min(1).max(99).default(1),
  design: shopDesignSchema.nullable().optional()
});

export const shopAddressSchema = z.object({
  label: z.string().max(40).nullable().optional(),
  name: z.string().min(1).max(80),
  phone: z.string().min(10).max(16),
  line1: z.string().min(1).max(160),
  line2: z.string().max(160).nullable().optional(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  isDefault: z.boolean().optional()
});

export const shopEstimateSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  weightGrams: z.number().int().min(0).max(50000)
});

export const shopVariantSchema = z.object({
  sku: z.string(), name: z.string(), nameHi: z.string().nullable(), salePaise: z.number().int(), mrpPaise: z.number().int(),
  gstPercent: z.number().int(), stock: z.number().int(), minQty: z.number().int(), ships: z.boolean(), weightGrams: z.number().int(),
  imageUrl: z.string().nullable(), includedLifetime: z.boolean()
});
export const shopProductSchema = z.object({
  slug: z.string(), name: z.string(), nameHi: z.string().nullable(), description: z.string(), descriptionHi: z.string().nullable(),
  needsNfc: z.boolean(), needsDesign: z.boolean(), defaultTemplateId: z.string().nullable(), fromPaise: z.number().int(),
  mrpPaise: z.number().int(), ships: z.boolean(), imageUrl: z.string().nullable(), category: z.enum(["stand", "card", "sticker", "keychain", "digital"]),
  variants: z.array(shopVariantSchema)
});
export const shopCatalogResponseSchema = z.object({ items: z.array(shopProductSchema) });

const shopQuoteLineSchema = z.object({
  sku: z.string(), qty: z.number().int(), grossPaise: z.number().int(), discountPaise: z.number().int(), netPaise: z.number().int(),
  gstPercent: z.number().int(), taxablePaise: z.number().int(), cgstPaise: z.number().int(), sgstPaise: z.number().int(), igstPaise: z.number().int()
});
export const shopQuoteSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true), lines: z.array(shopQuoteLineSchema), subtotalPaise: z.number().int(), couponPaise: z.number().int(),
    referralPaise: z.number().int(), couponRejected: z.boolean(), referralRejected: z.boolean(), discountPaise: z.number().int(),
    totalPaise: z.number().int(), taxablePaise: z.number().int(), cgstPaise: z.number().int(), sgstPaise: z.number().int(), igstPaise: z.number().int(), shippingPaise: z.number().int()
  }),
  z.object({ ok: z.literal(false), error: z.string() })
]);
export const shopCartViewSchema = z.object({
  businessId: z.string().nullable(), qrBusinessId: z.string().nullable(), couponCode: z.string().nullable(), referralCode: z.string().nullable(), buyerGstin: z.string().nullable(),
  buyerLegalName: z.string().nullable(), addressId: z.string().nullable(),
  lines: z.array(z.object({
    sku: z.string(), name: z.string(), nameHi: z.string().nullable(), qty: z.number().int(), unitPaise: z.number().int(), mrpPaise: z.number().int(),
    gstPercent: z.number().int(), stock: z.number().int(), minQty: z.number().int(), ships: z.boolean(), weightGrams: z.number().int(),
    imageUrl: z.string().nullable(), needsDesign: z.boolean(), needsNfc: z.boolean(), includedLifetime: z.boolean(), active: z.boolean(),
    design: shopDesignSchema.nullable(), designError: z.string().nullable()
  })),
  quote: shopQuoteSchema,
  addresses: z.array(z.object({ id: z.string(), label: z.string().nullable(), name: z.string(), phone: z.string(), line1: z.string(), line2: z.string().nullable(), city: z.string(), state: z.string(), pincode: z.string(), isDefault: z.boolean() })),
  businesses: z.array(z.object({ id: z.string(), name: z.string() })),
  qrCodes: z.array(z.object({ shortCode: z.string(), label: z.string().nullable(), url: z.string() })),
  devices: z.array(z.object({ id: z.string(), kind: z.string(), chipUid: z.string().nullable() })),
  templates: z.array(z.object({ id: z.string(), name: z.string() }))
});
export const shopOrdersResponseSchema = z.object({ items: z.array(z.object({
  id: z.string(), status: z.string(), statusLabel: z.string(), paymentStatus: z.string(), totalPaise: z.number().int(),
  invoiceNumber: z.string().nullable(), createdAt: z.string(), lines: z.array(z.object({ sku: z.string(), name: z.string(), qty: z.number().int(), imageUrl: z.string().nullable() })),
  shipment: z.object({ provider: z.string(), courierName: z.string().nullable(), awb: z.string().nullable(), etaDays: z.number().int().nullable() }).nullable()
})) });

export type ShopProduct = z.infer<typeof shopProductSchema>;
export type ShopCartView = z.infer<typeof shopCartViewSchema>;
export type ShopOrdersResponse = z.infer<typeof shopOrdersResponseSchema>;

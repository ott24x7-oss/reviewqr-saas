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

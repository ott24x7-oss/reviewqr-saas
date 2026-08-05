import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email").max(200).toLowerCase();
export const phoneSchema = z
  .string()
  .min(10)
  .max(15)
  .regex(/^[+]?[\d\s-]+$/, "Enter a valid phone number");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(100)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  password: passwordSchema,
  businessName: z.string().min(2).max(80).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

// Accept either an http(s) URL or a base64 data URL (≤ ~700KB encoded). Logos
// are auto-resized client-side so they comfortably fit; covers are larger.
const imageString = z
  .string()
  .max(1_500_000)
  .refine((s) => /^(https?:|data:image\/)/i.test(s), "Invalid image");

export const businessSchema = z.object({
  name: z.string().min(2).max(80),
  industry: z.string().max(60).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  logo: imageString.nullable().optional(),
  coverImage: imageString.nullable().optional(),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  whatsappNumber: phoneSchema.optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(60).optional().or(z.literal("")),
  pincode: z.string().regex(/^\d{6}$/, "Enter 6-digit PIN").optional().or(z.literal("")),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  ratingThreshold: z.number().int().min(1).max(5).default(4),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1a73e8"),
  customThankYou: z.string().max(500).optional().or(z.literal("")),
  aiReviewsEnabled: z.boolean().optional(),
  services: z.string().max(2000).optional().or(z.literal(""))
});

export const locationSchema = z.object({
  name: z.string().min(2).max(80),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(60).optional().or(z.literal("")),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  googleReviewUrl: z.string().url().optional().or(z.literal(""))
});

export const staffSchema = z.object({
  name: z.string().min(2).max(80),
  role: z.string().max(60).optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal(""))
});

export const reviewSubmitSchema = z.object({
  businessSlug: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional().or(z.literal("")),
  customerName: z.string().max(80).optional().or(z.literal("")),
  customerEmail: emailSchema.optional().or(z.literal("")),
  customerPhone: phoneSchema.optional().or(z.literal("")),
  npsScore: z.number().int().min(0).max(10).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().max(20).optional(),
  locationSlug: z.string().max(100).optional().or(z.literal("")),
  staffSlug: z.string().max(100).optional().or(z.literal("")),
  qrCode: z.string().max(20).optional().or(z.literal("")),
  turnstileToken: z.string().optional().or(z.literal(""))
});

export const qrCodeSchema = z.object({
  type: z.enum(["COUNTER", "TABLE", "BILL", "CARD", "POSTER", "CUSTOM"]),
  label: z.string().min(1).max(80),
  locationId: z.string().optional().or(z.literal("")),
  staffId: z.string().optional().or(z.literal(""))
});

export const campaignSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional().or(z.literal("")),
  whatsappTemplate: z.string().max(2000).optional().or(z.literal("")),
  emailTemplate: z.string().max(5000).optional().or(z.literal("")),
  emailSubject: z.string().max(120).optional().or(z.literal(""))
});

export const contactSchema = z.object({
  name: z.string().max(80).optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  notes: z.string().max(300).optional().or(z.literal(""))
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

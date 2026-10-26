import { z } from "zod";
import { tokenPairSchema } from "./auth";

export const adminPlatformSchema = z.enum(["ios", "android", "web"]);
export const adminDeviceStatusSchema = z.enum(["PENDING", "ACTIVE", "REVOKED"]);

export const adminOtpVerifySchema = z.object({
  phone: z.string().min(10, "Enter a valid mobile number").max(20),
  code: z.string().regex(/^\d{6}$/, "Invalid code"),
  deviceName: z.string().trim().min(1).max(80),
  platform: adminPlatformSchema.default("android"),
  pushToken: z.string().max(240).optional(),
  deviceId: z.string().max(64).optional(),
  /** Returned once when this phone was first registered. Required to reuse deviceId. */
  deviceSecret: z.string().max(128).optional()
});

export const adminDeviceSchema = z.object({
  id: z.string(),
  status: adminDeviceStatusSchema,
  name: z.string(),
  platform: z.string()
});

export const adminSessionSchema = tokenPairSchema.extend({
  device: adminDeviceSchema,
  /** Present only when a new device was registered. Store it securely; it is not shown again. */
  deviceSecret: z.string().optional()
});

/** Each step-up token confirms exactly one of these, once. */
export const adminStepUpActionSchema = z.enum([
  "approve_device",
  "mark_payout_paid",
  "refund_payment",
  "approve_payment",
  "grant_days_over_30",
  "change_user_plan",
  "change_role",
  "change_plan_price",
  "change_plan_modules",
  "change_settings",
  "whatsapp_pairing"
]);
export type AdminStepUpAction = z.infer<typeof adminStepUpActionSchema>;

export const adminStepUpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Invalid code").optional(),
  /** Required with a code. The token that comes back works only for this action. */
  action: adminStepUpActionSchema.optional()
});

export const adminStepUpTokenSchema = z.object({
  stepUpToken: z.string(),
  expiresIn: z.number().int()
});

export const adminDeviceActionSchema = z.object({
  action: z.enum(["approve", "revoke"])
});

export const adminRangeSchema = z.enum(["today", "7d", "30d", "mtd", "custom"]);

export const adminInboxSegmentSchema = z.enum([
  "agents",
  "devices",
  "proofs",
  "payouts",
  "refunds",
  "shop",
  "support",
  "failed"
]);

export const adminInboxActionSchema = z.object({
  segment: adminInboxSegmentSchema,
  action: z.enum(["approve", "reject", "close", "advance", "revoke"]),
  id: z.string().min(1).max(64).optional(),
  ids: z.array(z.string().min(1).max(64)).max(50).optional(),
  reason: z.string().max(500).optional()
});

export const adminUserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("plan"),
    planId: z.string().min(1).max(64),
    duration: z.enum(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"]).optional(),
    /** Required, with step-up, when the plan grants more than 30 days. */
    reason: z.string().trim().max(500).optional()
  }),
  z.object({
    action: z.literal("grant"),
    days: z.number().int().min(1).max(3650),
    /** Required, with step-up, above 30 days. */
    reason: z.string().trim().max(500).optional()
  }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("reset-onboarding") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("role"), role: z.enum(["USER", "ADMIN", "AGENCY", "STAFF", "AGENT"]) }),
  z.object({ action: z.literal("reveal") })
]);

export const adminBusinessActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("reveal") })
]);

export const adminPaymentActionSchema = z.object({
  action: z.enum(["approve", "reject", "refund", "reconcile", "invoice"]),
  refundUtr: z.string().max(120).optional(),
  reason: z.string().max(500).optional()
});

export const adminCommissionActionSchema = z.object({
  action: z.enum(["approve", "pay"]),
  agentId: z.string().min(1).max(64),
  utr: z.string().max(120).optional(),
  reason: z.string().max(500).optional()
});

export const adminPlanPatchSchema = z
  .object({
    active: z.boolean().optional(),
    visibleOnPricingPage: z.boolean().optional(),
    badge: z.string().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    descriptionEn: z.string().max(500).optional(),
    descriptionHi: z.string().max(500).optional(),
    modules: z.array(z.string()).optional(),
    duration: z.enum(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"]).optional(),
    pricePaise: z.number().int().min(0).max(100_000_000).optional(),
    mrpPaise: z.number().int().min(0).max(100_000_000).nullable().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), { message: "Nothing to update" });

export type AdminPlanPatch = z.infer<typeof adminPlanPatchSchema>;

export const adminTeamActionSchema = z.object({
  action: z.enum(["update", "reassign", "approve", "reject", "pause", "resume", "share", "move"]),
  id: z.string().min(1).max(64),
  name: z.string().trim().max(80).optional(),
  upiId: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  active: z.boolean().optional(),
  businessId: z.string().optional(),
  agentUserId: z.string().optional(),
  sharePercent: z.number().int().optional(),
  leaderUserId: z.string().optional()
});

export const adminShopActionSchema = z.object({
  action: z.enum(["move", "approve-proof", "tracking"]),
  to: z.string().max(40).optional(),
  awb: z.string().max(64).optional(),
  courierName: z.string().max(80).optional(),
  comment: z.string().max(500).optional()
});

export const adminSupportActionSchema = z.object({
  body: z.string().max(4000).optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional()
});

export const adminWhatsAppTestSchema = z.object({
  message: z.string().max(500).optional()
});

export const adminNotifyPrefSchema = z.object({
  paidPayment: z.boolean().optional(),
  failedPayment: z.boolean().optional(),
  signup: z.boolean().optional(),
  agentPending: z.boolean().optional(),
  printProof: z.boolean().optional(),
  payoutDue: z.boolean().optional(),
  supportTicket: z.boolean().optional(),
  whatsappDown: z.boolean().optional()
});

export const adminSettingsPatchSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(240).optional(),
  autoApproveSubAgents: z.boolean().optional(),
  maxTeamDepth: z.number().int().min(1).max(5).optional(),
  minSharePercent: z.number().int().min(0).max(100).optional(),
  maxSharePercent: z.number().int().min(0).max(100).optional(),
  tdsPercent: z.number().int().min(0).max(30).optional(),
  tdsYearlyThresholdPaise: z.number().int().min(0).optional(),
  minVersionCode: z.number().int().min(0).optional(),
  latestVersionCode: z.number().int().min(0).optional(),
  flags: z.record(z.boolean()).optional(),
  notify: adminNotifyPrefSchema.optional()
});

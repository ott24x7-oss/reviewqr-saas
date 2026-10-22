import { z } from "zod";

export const otpRequestSchema = z.object({
  phone: z.string().min(10, "Enter a valid mobile number").max(20)
});

export const otpVerifySchema = z.object({
  phone: z.string().min(10, "Enter a valid mobile number").max(20),
  code: z.string().regex(/^\d{6}$/, "Invalid code"),
  deviceName: z.string().max(80).optional()
});

export const loginSchema = z.object({
  email: z.string().email("Email or password is wrong").max(200),
  password: z.string().min(1, "Email or password is wrong").max(200),
  deviceName: z.string().max(80).optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16).max(200),
  deviceName: z.string().max(80).optional()
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).max(200)
});

export const otpSentSchema = z.object({
  sent: z.literal(true),
  channel: z.enum(["whatsapp", "email", "dev"]).optional(),
  resendAfterSec: z.number().int().positive().optional(),
  message: z.string().optional(),
  devCode: z.string().optional()
});

export const otpSignupSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    phone: z.string().min(10, "Enter a valid mobile number").max(20),
    email: z.string().email().optional().or(z.literal(""))
  }),
  z.object({
    action: z.literal("confirm"),
    phone: z.string().min(10, "Enter a valid mobile number").max(20),
    code: z.string().regex(/^\d{6}$/, "Invalid code")
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().min(10, "Enter a valid mobile number").max(20),
    code: z.string().regex(/^\d{6}$/, "Invalid code"),
    name: z.string().min(2).max(80),
    email: z.string().email().optional().or(z.literal("")),
    deviceName: z.string().max(80).optional()
  }),
  z.object({
    action: z.literal("finish"),
    phone: z.string().min(10, "Enter a valid mobile number").max(20),
    signupToken: z.string().min(16).max(200),
    name: z.string().min(2).max(80),
    businessName: z.union([z.string().min(2).max(80), z.literal("")]).optional(),
    email: z.string().email().optional().or(z.literal("")),
    deviceName: z.string().max(80).optional()
  })
]);

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  tokenType: z.literal("Bearer")
});

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string(),
  pushEnabled: z.boolean()
});

export const mePatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    pushEnabled: z.boolean().optional()
  })
  .refine((value) => value.name !== undefined || value.pushEnabled !== undefined, {
    message: "Nothing to update"
  });

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { errorMap: () => ({ message: "Type DELETE to confirm." }) })
});

export const accountDeletionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request") }),
  z.object({
    action: z.literal("confirm"),
    code: z.string().regex(/^\d{6}$/, "Invalid code")
  })
]);

export const pushRegisterSchema = z.object({
  token: z
    .string()
    .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/, "Enter an Expo push token")
    .max(240),
  platform: z.enum(["IOS", "ANDROID"])
});

export const pushUnregisterSchema = z.object({
  token: z.string().min(1).max(240)
});

export const sessionSchema = z.object({
  id: z.string(),
  deviceName: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string()
});

export const okSchema = z.object({ ok: z.literal(true) });

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpSignupInput = z.infer<typeof otpSignupSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type Me = z.infer<typeof meSchema>;
export type MePatch = z.infer<typeof mePatchSchema>;
export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
export type DeviceSession = z.infer<typeof sessionSchema>;

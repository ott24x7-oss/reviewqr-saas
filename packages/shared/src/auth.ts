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
  devCode: z.string().optional()
});

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
  role: z.string()
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
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type Me = z.infer<typeof meSchema>;
export type DeviceSession = z.infer<typeof sessionSchema>;

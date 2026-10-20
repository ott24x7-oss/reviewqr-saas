import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { createOtpSession, findUserByPhone, requestSignupOtp, verifySignupOtp } from "@/lib/otp";
import { markOnboarding } from "@/lib/tap/onboarding-mark";
import { sendVerificationEmail } from "@/lib/verify-email";

const requestSchema = z.object({
  action: z.literal("request"),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal(""))
});

const verifySchema = z.object({
  action: z.literal("verify"),
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal(""))
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `otp-signup:${ip}`, limit: 8, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    const sent = await requestSignupOtp(parsed.data.phone, parsed.data.email || null);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
    return NextResponse.json({ ok: true });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });
  const checked = await verifySignupOtp(parsed.data.phone, parsed.data.code);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const existing = await findUserByPhone(parsed.data.phone);
  if (existing) {
    return NextResponse.json({ error: "An account with this mobile already exists. Sign in instead." }, { status: 409 });
  }

  const email = (parsed.data.email || "").toLowerCase().trim();
  const storedEmail = email || `phone+${checked.phone}@users.reviewqr.local`;
  const taken = await prisma.user.findUnique({ where: { email: storedEmail }, select: { id: true } });
  if (taken) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.create({
    data: {
      email: storedEmail,
      name: parsed.data.name.trim(),
      phone: checked.phone,
      password: null,
      role: "USER",
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt
    }
  });
  await markOnboarding(user.id, "start");
  if (email) sendVerificationEmail({ id: user.id, email, name: user.name }).catch(() => {});
  const otpToken = await createOtpSession(user.id);
  return NextResponse.json({ ok: true, otpToken });
}

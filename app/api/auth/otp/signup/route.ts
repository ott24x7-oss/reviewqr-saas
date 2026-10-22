import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { devOtpCode } from "@/lib/auth/dev-otp";
import { OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { slugify, getClientIp } from "@/lib/utils";
import {
  consumeSignupProof,
  createOtpSession,
  findUserByPhone,
  issueSignupProof,
  requestSignupOtp,
  verifySignupOtp
} from "@/lib/otp";
import { attachTapDraft } from "@/lib/tap/new-business";
import { markOnboarding } from "@/lib/tap/onboarding-mark";
import { isReservedSlug } from "@/lib/tap/reserved-slugs";
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

const confirmSchema = z.object({
  action: z.literal("confirm"),
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/)
});

const finishSchema = z.object({
  action: z.literal("finish"),
  phone: z.string().min(10).max(20),
  signupToken: z.string().min(16).max(200),
  name: z.string().min(2).max(80),
  businessName: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal(""))
});

async function createPhoneOwner(opts: {
  phone: string;
  name: string;
  email: string;
  businessName?: string;
}) {
  const existing = await findUserByPhone(opts.phone);
  if (existing) {
    return { error: "An account with this mobile already exists. Sign in instead.", status: 409 as const };
  }
  const email = opts.email.toLowerCase().trim();
  const storedEmail = email || `phone+${opts.phone}@users.reviewqr.local`;
  const taken = await prisma.user.findUnique({ where: { email: storedEmail }, select: { id: true } });
  if (taken) return { error: "An account with this email already exists", status: 409 as const };

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.create({
    data: {
      email: storedEmail,
      name: opts.name.trim(),
      phone: opts.phone,
      password: null,
      role: "USER",
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt
    }
  });

  if (opts.businessName) {
    let slug = slugify(opts.businessName);
    let count = 0;
    while (isReservedSlug(slug) || (await prisma.business.findUnique({ where: { slug } }))) {
      count += 1;
      slug = slugify(opts.businessName) + "-" + (count + 1);
      if (count > 5) {
        slug = slugify(opts.businessName, true);
        break;
      }
    }
    const business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: opts.businessName.trim(),
        slug,
        ratingThreshold: 4,
        reviewGating: false,
        primaryColor: "#1a73e8",
        whatsappNumber: opts.phone,
        email: email || null
      }
    });
    await attachTapDraft(business.id, null, { phone: opts.phone, whatsappNumber: opts.phone });
  }

  await markOnboarding(user.id, "start");
  if (email) sendVerificationEmail({ id: user.id, email, name: user.name }).catch(() => {});
  const otpToken = await createOtpSession(user.id);
  return { otpToken };
}

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
    const devCode = devOtpCode(sent.issuedCode);
    return NextResponse.json({
      ok: true,
      channel: sent.channel,
      resendAfterSec: OTP_RESEND_AFTER_SEC,
      ...(devCode ? { devCode } : {})
    });
  }

  if (body?.action === "confirm") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    const checked = await verifySignupOtp(parsed.data.phone, parsed.data.code);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    const existing = await findUserByPhone(parsed.data.phone);
    if (existing) {
      return NextResponse.json({ error: "An account with this mobile already exists. Sign in instead." }, { status: 409 });
    }
    const signupToken = await issueSignupProof(checked.phone);
    return NextResponse.json({ ok: true, signupToken });
  }

  if (body?.action === "finish") {
    const parsed = finishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the business name" }, { status: 400 });
    }
    const phone = await consumeSignupProof(parsed.data.phone, parsed.data.signupToken);
    if (!phone) return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    const created = await createPhoneOwner({
      phone,
      name: parsed.data.name,
      email: parsed.data.email || "",
      businessName: parsed.data.businessName
    });
    if ("error" in created) return NextResponse.json({ error: created.error }, { status: created.status });
    return NextResponse.json({ ok: true, otpToken: created.otpToken });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code" }, { status: 400 });
  const checked = await verifySignupOtp(parsed.data.phone, parsed.data.code);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const created = await createPhoneOwner({
    phone: checked.phone,
    name: parsed.data.name,
    email: parsed.data.email || ""
  });
  if ("error" in created) return NextResponse.json({ error: created.error }, { status: created.status });
  return NextResponse.json({ ok: true, otpToken: created.otpToken });
}

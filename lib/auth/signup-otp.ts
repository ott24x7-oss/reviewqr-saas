import { otpSignupSchema } from "@reviewqr/shared";
import { prisma } from "../db";
import {
  consumeSignupProof,
  createOtpSession,
  findUserByPhone,
  issueSignupProof,
  requestSignupOtp,
  verifySignupOtp
} from "../otp";
import { attachTapDraft } from "../tap/new-business";
import { markOnboarding } from "../tap/onboarding-mark";
import { isReservedSlug } from "../tap/reserved-slugs";
import { slugify } from "../utils";
import { sendVerificationEmail } from "../verify-email";
import { cookies } from "next/headers";
import { JOIN_COOKIE, applySignupAttribution } from "../plans/attribution";
import { queueAdminPush } from "../admin/push";

export type SignupOtpResult =
  | { ok: true; kind: "request"; channel: "whatsapp" | "email" | "dev"; issuedCode: string }
  | { ok: true; kind: "confirm"; signupToken: string }
  | { ok: true; kind: "session"; otpToken: string; deviceName?: string }
  | { ok: false; status: number; error: string };

async function createPhoneOwner(opts: {
  phone: string;
  name: string;
  email: string;
  businessName?: string;
}) {
  const existing = await findUserByPhone(opts.phone);
  if (existing) {
    return { ok: false as const, error: "An account with this mobile already exists. Sign in instead.", status: 409 };
  }
  const email = opts.email.toLowerCase().trim();
  const storedEmail = email || `phone+${opts.phone}@users.reviewqr.local`;
  const taken = await prisma.user.findUnique({ where: { email: storedEmail }, select: { id: true } });
  if (taken) return { ok: false as const, error: "An account with this email already exists", status: 409 };

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
  void queueAdminPush({
    event: "signup",
    collapseKey: user.id,
    title: "New signup",
    body: "A new owner joined QR24x7.",
    windowSeconds: 86400
  });

  let businessId: string | null = null;
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
    businessId = business.id;
  }

  const cookie = await Promise.resolve(cookies())
    .then((jar) => jar.get(JOIN_COOKIE)?.value)
    .catch(() => undefined);
  await applySignupAttribution({
    userId: user.id,
    businessId,
    cookie,
    phone: opts.phone,
    email: storedEmail
  });

  await markOnboarding(user.id, "start");
  if (email) sendVerificationEmail({ id: user.id, email, name: user.name }).catch(() => {});
  const otpToken = await createOtpSession(user.id);
  return { ok: true as const, otpToken };
}

export async function runSignupOtp(body: unknown): Promise<SignupOtpResult> {
  const parsed = otpSignupSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Enter a valid mobile number";
    return { ok: false, status: 400, error: message };
  }
  const data = parsed.data;

  if (data.action === "request") {
    const sent = await requestSignupOtp(data.phone, data.email || null);
    if (!sent.ok) return { ok: false, status: 503, error: sent.error };
    return { ok: true, kind: "request", channel: sent.channel, issuedCode: sent.issuedCode };
  }

  if (data.action === "confirm") {
    const checked = await verifySignupOtp(data.phone, data.code);
    if (!checked.ok) return { ok: false, status: 400, error: checked.error };
    const existing = await findUserByPhone(data.phone);
    if (existing) {
      return { ok: false, status: 409, error: "An account with this mobile already exists. Sign in instead." };
    }
    const signupToken = await issueSignupProof(checked.phone);
    return { ok: true, kind: "confirm", signupToken };
  }

  if (data.action === "finish") {
    const phone = await consumeSignupProof(data.phone, data.signupToken);
    if (!phone) return { ok: false, status: 400, error: "Code expired. Request a new one." };
    const created = await createPhoneOwner({
      phone,
      name: data.name,
      email: data.email || "",
      businessName: data.businessName
    });
    if (!created.ok) return { ok: false, status: created.status, error: created.error };
    return { ok: true, kind: "session", otpToken: created.otpToken, deviceName: data.deviceName };
  }

  const checked = await verifySignupOtp(data.phone, data.code);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };
  const created = await createPhoneOwner({
    phone: checked.phone,
    name: data.name,
    email: data.email || ""
  });
  if (!created.ok) return { ok: false, status: created.status, error: created.error };
  return { ok: true, kind: "session", otpToken: created.otpToken, deviceName: data.deviceName };
}

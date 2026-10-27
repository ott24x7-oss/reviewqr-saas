import { prisma } from "../db";
import { findUserByPhone, phoneKey, requestSignupOtp, verifySignupOtp } from "../otp";
import { agentOnboardLimits, enforceOtpLimits, otpLimitMessage } from "../otp-message";
import { rateLimitDb } from "../rate-limit";
import { slugify } from "../utils";
import { isReservedSlug } from "../tap/reserved-slugs";
import { attachTapDraft } from "../tap/new-business";
import { makeCode } from "./codes";
import { applySignupAttribution } from "./attribution";

export async function freshAgentCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = makeCode(8);
    const taken = await prisma.agentProfile.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  return makeCode(10);
}

export async function createAgentAccount(input: {
  name: string;
  phone: string;
  email?: string | null;
  upiId?: string | null;
  city?: string | null;
  active?: boolean;
}) {
  const phone = phoneKey(input.phone);
  if (!phone) return { ok: false as const, error: "Enter a valid mobile number" };
  const email = (input.email || "").trim().toLowerCase();
  const existing = await findUserByPhone(phone);
  if (existing?.role === "ADMIN") return { ok: false as const, error: "That mobile belongs to an admin" };
  if (existing) {
    const profile = await prisma.agentProfile.findUnique({ where: { userId: existing.id }, select: { id: true } });
    if (profile) return { ok: false as const, error: "This person is already an agent" };
  }
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (byEmail && byEmail.id !== existing?.id) return { ok: false as const, error: "That email is already in use" };
  }
  const code = await freshAgentCode();
  const user =
    existing ||
    (await prisma.user.create({
      data: {
        name: input.name.trim(),
        phone,
        email: email || `phone+${phone}@users.reviewqr.local`,
        role: "AGENT",
        password: null,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE"
      }
    }));
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "AGENT",
        name: input.name.trim() || existing.name,
        phone,
        ...(email ? { email } : {})
      }
    });
  }
  const profile = await prisma.agentProfile.create({
    data: {
      userId: user.id,
      code,
      upiId: (input.upiId || "").trim(),
      city: (input.city || "").trim(),
      active: input.active !== false
    }
  });
  return { ok: true as const, profile, userId: user.id };
}

export async function startAgentOnboarding(agentId: string, phoneRaw: string, businessName: string) {
  const profile = await prisma.agentProfile.findUnique({
    where: { userId: agentId },
    include: { user: { select: { phone: true } } }
  });
  if (!profile?.active) return { ok: false as const, error: "This agent account is not active" };
  const phone = phoneKey(phoneRaw);
  if (!phone) return { ok: false as const, error: "Enter a valid mobile number" };
  if (phoneKey(profile.user.phone || "") === phone) {
    return { ok: false as const, error: "You cannot onboard your own mobile" };
  }
  const name = businessName.trim();
  if (name.length < 2) return { ok: false as const, error: "Enter the business name" };
  const limited = await enforceOtpLimits(agentOnboardLimits(phone, agentId), rateLimitDb);
  if (!limited.ok) return { ok: false as const, error: otpLimitMessage(limited.key) };
  const row = await prisma.agentOnboarding.create({
    data: { agentId, phone, businessName: name }
  });
  const sent = await requestSignupOtp(phone);
  if (!sent.ok) return { ok: false as const, error: sent.error };
  return { ok: true as const, id: row.id, channel: sent.channel, issuedCode: sent.issuedCode };
}

export async function confirmAgentOnboarding(phoneRaw: string, code: string, ownerName: string) {
  const checked = await verifySignupOtp(phoneRaw, code);
  if (!checked.ok) return { ok: false as const, status: 400, error: checked.error };
  const onboarding = await prisma.agentOnboarding.findFirst({
    where: { phone: checked.phone, confirmedAt: null },
    orderBy: { createdAt: "desc" }
  });
  if (!onboarding) return { ok: false as const, status: 404, error: "No onboarding is waiting for this mobile" };
  const name = ownerName.trim();
  if (name.length < 2) return { ok: false as const, status: 400, error: "Enter your name" };

  let owner = await findUserByPhone(checked.phone);
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        name,
        phone: checked.phone,
        email: `phone+${checked.phone}@users.reviewqr.local`,
        role: "USER",
        password: null,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });
  }
  let slug = slugify(onboarding.businessName);
  let n = 0;
  while (isReservedSlug(slug) || (await prisma.business.findUnique({ where: { slug } }))) {
    n += 1;
    slug = `${slugify(onboarding.businessName)}-${n + 1}`;
    if (n > 5) {
      slug = slugify(onboarding.businessName, true);
      break;
    }
  }
  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: onboarding.businessName,
      slug,
      ratingThreshold: 4,
      reviewGating: false,
      primaryColor: "#1a73e8",
      whatsappNumber: checked.phone,
      phone: checked.phone
    }
  });
  await attachTapDraft(business.id, null, { phone: checked.phone, whatsappNumber: checked.phone });
  await applySignupAttribution({
    userId: owner.id,
    businessId: business.id,
    explicitAgentId: onboarding.agentId,
    phone: checked.phone,
    email: owner.email
  });
  await prisma.agentOnboarding.update({
    where: { id: onboarding.id },
    data: { confirmedAt: new Date(), ownerUserId: owner.id, businessId: business.id }
  });
  return { ok: true as const, businessId: business.id };
}

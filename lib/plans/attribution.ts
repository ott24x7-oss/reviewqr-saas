import { prisma } from "../db";
import { normalizeCode } from "./codes";
import { chooseAttribution } from "./referral";

export const JOIN_COOKIE = "rq_join";

/**
 * First attribution wins. An agent link replaces an owner link.
 * An agent link is never replaced by a later agent or owner link.
 * Returns the cookie value to store, or null when the current cookie stays.
 */
export function joinCookieUpdate(
  current: string | null | undefined,
  incoming: { kind: "agent" | "owner"; code: string }
) {
  const code = normalizeCode(incoming.code);
  if (!code) return null;
  const parsed = parseJoinCookie(current);
  if (parsed?.kind === "agent") return null;
  if (parsed && incoming.kind === "owner") return null;
  return `${incoming.kind}:${code}`;
}

export function parseJoinCookie(value: string | null | undefined) {
  const raw = (value || "").trim();
  const split = raw.indexOf(":");
  if (split < 1) return null;
  const kind = raw.slice(0, split);
  const code = normalizeCode(raw.slice(split + 1));
  if (!code || (kind !== "agent" && kind !== "owner")) return null;
  return { kind, code } as const;
}

function phoneTail(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function mailKey(value: string | null | undefined) {
  const email = (value || "").trim().toLowerCase();
  if (!email || email.endsWith("@users.reviewqr.local")) return "";
  return email;
}

function samePerson(
  candidate: { id: string; phone?: string | null; email?: string | null },
  input: { userId: string; phone?: string | null; email?: string | null }
) {
  if (candidate.id === input.userId) return true;
  const phone = phoneTail(input.phone);
  if (phone && phone === phoneTail(candidate.phone)) return true;
  const email = mailKey(input.email);
  if (email && email === mailKey(candidate.email)) return true;
  return false;
}

export async function applySignupAttribution(input: {
  userId: string;
  businessId?: string | null;
  cookie?: string | null;
  explicitAgentId?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const existing = await prisma.signupAttribution.findUnique({ where: { userId: input.userId } });
  if (existing) {
    if (input.businessId && existing.agentId) {
      await prisma.business.updateMany({
        where: { id: input.businessId, agentId: null },
        data: { agentId: existing.agentId }
      });
    }
    return existing;
  }

  const parsed = parseJoinCookie(input.cookie);
  let agentId: string | null = null;
  let agentCode = "";
  const agentUserId = input.explicitAgentId || null;
  if (agentUserId || parsed?.kind === "agent") {
    const profile = agentUserId
      ? await prisma.agentProfile.findUnique({
          where: { userId: agentUserId },
          include: { user: { select: { id: true, phone: true, email: true } } }
        })
      : await prisma.agentProfile.findUnique({
          where: { code: parsed?.code || "" },
          include: { user: { select: { id: true, phone: true, email: true } } }
        });
    if (profile?.active && !samePerson(profile.user, input)) {
      agentId = profile.userId;
      agentCode = profile.code;
    }
  }

  let referrerUserId: string | null = null;
  let ownerCode = "";
  if (!agentId && parsed?.kind === "owner") {
    const referral = await prisma.ownerReferral.findUnique({
      where: { code: parsed.code },
      include: { user: { select: { id: true, phone: true, email: true } } }
    });
    if (referral && !samePerson(referral.user, input)) {
      referrerUserId = referral.userId;
      ownerCode = referral.code;
    }
  }

  const choice = chooseAttribution({ agentCode: !!agentId, ownerCode: !!referrerUserId });
  if (!choice) return null;
  try {
    const row = await prisma.signupAttribution.create({
      data: {
        userId: input.userId,
        agentId: choice === "agent" ? agentId : null,
        referrerUserId: choice === "owner" ? referrerUserId : null,
        code: choice === "agent" ? agentCode : ownerCode
      }
    });
    if (input.businessId && row.agentId) {
      await prisma.business.updateMany({
        where: { id: input.businessId, agentId: null },
        data: { agentId: row.agentId }
      });
    }
    return row;
  } catch {
    return prisma.signupAttribution.findUnique({ where: { userId: input.userId } });
  }
}

export async function reassignBusinessAgent(businessId: string, agentUserId: string) {
  const [business, profile] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { id: true, ownerId: true } }),
    prisma.agentProfile.findUnique({ where: { userId: agentUserId }, select: { userId: true, code: true, active: true } })
  ]);
  if (!business) return { ok: false as const, error: "Business not found" };
  if (!profile?.active) return { ok: false as const, error: "Agent not found" };
  if (business.ownerId === profile.userId) return { ok: false as const, error: "An agent cannot own that business" };
  await prisma.business.update({ where: { id: business.id }, data: { agentId: profile.userId } });
  const existing = await prisma.signupAttribution.findUnique({ where: { userId: business.ownerId } });
  if (existing) {
    await prisma.signupAttribution.update({
      where: { id: existing.id },
      data: { agentId: profile.userId, referrerUserId: null, code: profile.code }
    });
  } else {
    await prisma.signupAttribution.create({
      data: { userId: business.ownerId, agentId: profile.userId, code: profile.code }
    });
  }
  return { ok: true as const };
}

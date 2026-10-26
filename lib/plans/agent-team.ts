import type { ShopCommissionKind } from "@prisma/client";
import type { AgentCommissionKind, AgentProfilePut } from "@reviewqr/shared";
import { prisma } from "../db";
import { rateLimitDb } from "../rate-limit";
import { absoluteUrl } from "../utils";
import { decryptSecret, encryptSecret } from "../crypto";
import { phoneKey } from "../otp";
import { sendWhatsApp } from "../whatsapp";
import { encodeCursor } from "../api/cursor";
import { fail, ok, type ServiceResult } from "../api/result";
import { freshAgentCode } from "./agents";
import { makeCode, normalizeCode } from "./codes";
import { indiaDayStart, indiaMonthStart } from "./india";
import { getTeamProgramSettings } from "./team-settings";

const SALE_KINDS: ShopCommissionKind[] = ["SALE", "RENEWAL", "HARDWARE", "ORDER"];
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const INVITE_DAYS = 14;

type ProfileRow = {
  id: string;
  userId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED";
  active: boolean;
  depth: number;
  sharePercent: number | null;
  city: string;
  upiId: string;
  pan: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  code: string;
  leaderId: string | null;
};

function maskPhone(phone: string | null | undefined) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

function maskPan(pan: string) {
  const clean = pan.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length < 4) return "";
  return `••••••${clean.slice(-4)}`;
}

function last4(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function looksMasked(value: string) {
  return /[•*]/.test(value);
}

export function publicCommissionKind(kind: string, saleKind: string): AgentCommissionKind {
  if (kind === "TEAM_OVERRIDE") return "TEAM_OVERRIDE";
  if (kind === "RENEWAL") return "RENEWAL";
  if (kind === "HARDWARE" || saleKind === "HARDWARE") return "HARDWARE";
  return "SALE";
}

async function requireProfile(userId: string) {
  const profile = await prisma.agentProfile.findUnique({ where: { userId } });
  if (!profile) return fail(404, "No agent profile");
  return ok(profile);
}

function canRecruit(profile: { status: string; active: boolean; depth: number }, maxTeamDepth: number) {
  return profile.status === "ACTIVE" && profile.active && profile.depth < maxTeamDepth;
}

export async function loadContractHome(agentId: string) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  const day = indiaDayStart();
  const month = indiaMonthStart();
  const [commissions, businesses, members] = await Promise.all([
    prisma.shopCommission.findMany({
      where: { agentId, status: { not: "REVERSED" } },
      select: { amountPaise: true, status: true, createdAt: true }
    }),
    prisma.business.count({ where: { agentId, archived: false } }),
    prisma.agentProfile.findMany({ where: { leaderId: profile.data.id }, select: { userId: true } })
  ]);
  const memberIds = members.map((member) => member.userId);
  const monthSales = memberIds.length
    ? await prisma.shopCommission.aggregate({
        where: {
          agentId: { in: memberIds },
          kind: { in: SALE_KINDS },
          status: { not: "REVERSED" },
          createdAt: { gte: month }
        },
        _sum: { amountPaise: true }
      })
    : { _sum: { amountPaise: 0 } };
  const earnings = { todayPaise: 0, monthPaise: 0, pendingPaise: 0, paidPaise: 0 };
  for (const row of commissions) {
    if (row.createdAt >= day) earnings.todayPaise += row.amountPaise;
    if (row.createdAt >= month) earnings.monthPaise += row.amountPaise;
    if (row.status === "PENDING") earnings.pendingPaise += row.amountPaise;
    if (row.status === "PAID") earnings.paidPaise += row.amountPaise;
  }
  return ok({
    earnings,
    businesses,
    team: { members: members.length, monthSalesPaise: monthSales._sum.amountPaise || 0 },
    status: profile.data.status
  });
}

export async function loadAgentBusinesses(agentId: string) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  const businesses = await prisma.business.findMany({
    where: { agentId, archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  const ownerIds = businesses.map((business) => business.owner.id);
  const [subscriptions, payments] = await Promise.all([
    ownerIds.length
      ? prisma.subscription.findMany({
          where: { userId: { in: ownerIds }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
          orderBy: { createdAt: "desc" },
          include: { plan: { select: { nameEn: true } } }
        })
      : [],
    ownerIds.length
      ? prisma.payment.findMany({
          where: { userId: { in: ownerIds }, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          select: { userId: true, createdAt: true }
        })
      : []
  ]);
  const planByOwner = new Map<string, { name: string; status: string; endsAt: Date | null }>();
  for (const row of subscriptions) {
    if (!planByOwner.has(row.userId)) {
      planByOwner.set(row.userId, {
        name: row.plan?.nameEn || row.tier,
        status: row.status,
        endsAt: row.endsAt
      });
    }
  }
  const paidAt = new Map<string, Date>();
  for (const row of payments) {
    if (!paidAt.has(row.userId)) paidAt.set(row.userId, row.createdAt);
  }
  return ok({
    items: businesses.map((business) => {
      const plan = planByOwner.get(business.owner.id);
      const ends = plan?.endsAt || business.owner.subscriptionEndsAt;
      const last = paidAt.get(business.owner.id);
      return {
        id: business.id,
        name: business.name,
        planName: plan?.name || business.owner.subscriptionTier,
        status: plan?.status || business.owner.subscriptionStatus,
        endsAt: ends ? ends.toISOString() : null,
        lastPaymentAt: last ? last.toISOString() : null
      };
    })
  });
}

async function businessNameLookup(rows: Array<{ paymentId: string | null; orderId: string | null }>) {
  const paymentIds = [...new Set(rows.map((row) => row.paymentId).filter((id): id is string => !!id))];
  const orderIds = [...new Set(rows.map((row) => row.orderId).filter((id): id is string => !!id))];
  const [payments, orders] = await Promise.all([
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: {
            id: true,
            user: { select: { businesses: { take: 1, orderBy: { createdAt: "asc" }, select: { name: true } } } }
          }
        })
      : [],
    orderIds.length
      ? prisma.shopOrder.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, business: { select: { name: true } } }
        })
      : []
  ]);
  const byPayment = new Map(payments.map((row) => [row.id, row.user.businesses[0]?.name || "Sale"]));
  const byOrder = new Map(orders.map((row) => [row.id, row.business?.name || "Hardware"]));
  return (row: { paymentId: string | null; orderId: string | null }) =>
    (row.orderId && byOrder.get(row.orderId)) || (row.paymentId && byPayment.get(row.paymentId)) || "Sale";
}

export async function loadAgentCommissions(agentId: string, cursorId: string | null, limit: number) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  if (cursorId) {
    const owned = await prisma.shopCommission.findFirst({ where: { id: cursorId, agentId }, select: { id: true } });
    if (!owned) return fail(400, "Invalid cursor");
  }
  const rows = await prisma.shopCommission.findMany({
    where: { agentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
  });
  const page = rows.slice(0, limit);
  const sourceIds = page.filter((row) => row.kind === "TEAM_OVERRIDE").map((row) => row.sourceId);
  const [nameOf, children] = await Promise.all([
    businessNameLookup(page),
    sourceIds.length
      ? prisma.shopCommission.findMany({
          where: { sourceId: { in: sourceIds }, leaderId: agentId },
          select: { sourceId: true, agent: { select: { name: true } } }
        })
      : []
  ]);
  const fromName = new Map(children.map((row) => [row.sourceId, row.agent.name || "Agent"]));
  return ok({
    items: page.map((row) => {
      const item: {
        id: string;
        kind: AgentCommissionKind;
        amountPaise: number;
        sharePercent: number | null;
        fromAgentName?: string;
        businessName: string;
        status: string;
        createdAt: string;
      } = {
        id: row.id,
        kind: publicCommissionKind(row.kind, row.saleKind),
        amountPaise: row.amountPaise,
        sharePercent: row.sharePercent,
        businessName: nameOf(row),
        status: row.status,
        createdAt: row.createdAt.toISOString()
      };
      const from = fromName.get(row.sourceId);
      if (row.kind === "TEAM_OVERRIDE" && from) item.fromAgentName = from;
      return item;
    }),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1].id) : null
  });
}

export async function loadAgentPayouts(agentId: string) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  const rows = await prisma.commissionPayout.findMany({
    where: { agentId },
    orderBy: { paidAt: "desc" },
    take: 100
  });
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      grossPaise: row.grossPaise || row.amountPaise,
      tdsPaise: row.tdsPaise,
      netPaise: row.netPaise || row.amountPaise,
      utr: row.utr,
      paidAt: row.paidAt.toISOString()
    }))
  });
}

function profileView(profile: ProfileRow, name: string | null) {
  const pan = profile.pan ? decryptSecret(profile.pan) : "";
  const bank = profile.bankAccount ? decryptSecret(profile.bankAccount) : "";
  return {
    name: name || "Agent",
    city: profile.city,
    upiId: profile.upiId,
    pan: pan ? maskPan(pan) : "",
    bankLast4: bank ? last4(bank) : null
  };
}

export async function loadAgentProfile(agentId: string) {
  const profile = await prisma.agentProfile.findUnique({
    where: { userId: agentId },
    include: { user: { select: { name: true } } }
  });
  if (!profile) return fail(404, "No agent profile");
  return ok(profileView(profile, profile.user.name));
}

export async function saveAgentProfile(agentId: string, input: AgentProfilePut) {
  const profile = await prisma.agentProfile.findUnique({ where: { userId: agentId } });
  if (!profile) return fail(404, "No agent profile");
  const data: {
    city: string;
    upiId: string;
    pan?: string | null;
    bankAccount?: string | null;
    bankIfsc?: string | null;
    bankName?: string | null;
  } = { city: input.city, upiId: input.upiId };
  if (input.pan != null && !looksMasked(input.pan)) {
    const pan = input.pan.replace(/\s/g, "").toUpperCase();
    if (!pan) data.pan = null;
    else if (!PAN.test(pan)) return fail(400, "Enter a valid PAN");
    else data.pan = encryptSecret(pan);
  }
  if (input.bankAccount != null && !looksMasked(input.bankAccount)) {
    const account = input.bankAccount.replace(/\s/g, "");
    if (!account) data.bankAccount = null;
    else if (!/^\d{9,18}$/.test(account)) return fail(400, "Enter a valid bank account");
    else data.bankAccount = encryptSecret(account);
  }
  if (input.bankIfsc != null) {
    const ifsc = input.bankIfsc.replace(/\s/g, "").toUpperCase();
    if (!ifsc) data.bankIfsc = null;
    else if (!IFSC.test(ifsc)) return fail(400, "Enter a valid IFSC");
    else data.bankIfsc = ifsc;
  }
  if (input.bankName != null) data.bankName = input.bankName;
  await prisma.user.update({ where: { id: agentId }, data: { name: input.name } });
  const saved = await prisma.agentProfile.update({ where: { userId: agentId }, data });
  return ok(profileView(saved, input.name));
}

async function memberStats(leaderUserId: string, memberIds: string[]) {
  const month = indiaMonthStart();
  const sales = new Map<string, number>();
  const overrides = new Map<string, number>();
  const businesses = new Map<string, number>();
  if (!memberIds.length) return { sales, overrides, businesses };
  const [saleRows, sellerRows, businessRows] = await Promise.all([
    prisma.shopCommission.groupBy({
      by: ["agentId"],
      where: {
        agentId: { in: memberIds },
        kind: { in: SALE_KINDS },
        status: { not: "REVERSED" },
        createdAt: { gte: month }
      },
      _sum: { amountPaise: true }
    }),
    prisma.shopCommission.findMany({
      where: {
        agentId: { in: memberIds },
        leaderId: leaderUserId,
        kind: { in: SALE_KINDS },
        status: { not: "REVERSED" },
        createdAt: { gte: month }
      },
      select: { agentId: true, sourceId: true }
    }),
    prisma.business.groupBy({
      by: ["agentId"],
      where: { agentId: { in: memberIds }, archived: false },
      _count: { _all: true }
    })
  ]);
  for (const row of saleRows) sales.set(row.agentId, row._sum.amountPaise || 0);
  for (const row of businessRows) if (row.agentId) businesses.set(row.agentId, row._count._all);
  const sourceIds = sellerRows.map((row) => row.sourceId);
  const overrideRows = sourceIds.length
    ? await prisma.shopCommission.findMany({
        where: { agentId: leaderUserId, kind: "TEAM_OVERRIDE", sourceId: { in: sourceIds }, status: { not: "REVERSED" } },
        select: { sourceId: true, amountPaise: true }
      })
    : [];
  const overrideBySource = new Map(overrideRows.map((row) => [row.sourceId, row.amountPaise]));
  for (const row of sellerRows) {
    overrides.set(row.agentId, (overrides.get(row.agentId) || 0) + (overrideBySource.get(row.sourceId) || 0));
  }
  return { sales, overrides, businesses };
}

export async function loadAgentTeam(agentId: string) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  const settings = await getTeamProgramSettings();
  const [invite, members] = await Promise.all([
    prisma.agentInvite.findFirst({
      where: { leaderId: profile.data.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.agentProfile.findMany({
      where: { leaderId: profile.data.id },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const stats = await memberStats(
    agentId,
    members.map((member) => member.userId)
  );
  return ok({
    canRecruit: canRecruit(profile.data, settings.maxTeamDepth),
    maxSharePercent: settings.maxSharePercent,
    minSharePercent: settings.minSharePercent,
    inviteLink: invite ? absoluteUrl(`/agent/join/${invite.code}`) : "",
    members: members.map((member) => ({
      id: member.userId,
      name: member.user.name || "Agent",
      phoneMasked: maskPhone(member.user.phone),
      status: member.status,
      sharePercent: member.sharePercent,
      monthSalesPaise: stats.sales.get(member.userId) || 0,
      monthOverridePaise: stats.overrides.get(member.userId) || 0,
      businesses: stats.businesses.get(member.userId) || 0
    }))
  });
}

async function freshInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = makeCode(8);
    const taken = await prisma.agentInvite.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  return makeCode(10);
}

export async function createTeamInvite(agentId: string, phoneRaw?: string) {
  const profile = await requireProfile(agentId);
  if (!profile.ok) return profile;
  const settings = await getTeamProgramSettings();
  if (!canRecruit(profile.data, settings.maxTeamDepth)) return fail(403, "You cannot invite a team yet");
  let phone: string | null = null;
  if (phoneRaw && phoneRaw.trim()) {
    phone = phoneKey(phoneRaw);
    if (!phone) return fail(400, "Enter a valid mobile number");
  }
  const limit = await rateLimitDb({ key: `agent-invite:${agentId}`, limit: 10, windowSeconds: 3600 });
  if (!limit.ok) return fail(429, "You can send 10 invites an hour");
  const code = await freshInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.agentInvite.create({ data: { code, leaderId: profile.data.id, phone, expiresAt } });
  const inviteLink = absoluteUrl(`/agent/join/${code}`);
  if (phone) {
    await sendWhatsApp({
      to: phone,
      message: `Join my QR24x7 team: ${inviteLink}\nCode: ${code}\nThere is no joining fee. You earn only when a business you bring in pays for a plan or a device.`
    }).catch(() => undefined);
  }
  return ok({ inviteLink, code });
}

async function memberForLeader(leaderUserId: string, memberUserId: string) {
  const leader = await requireProfile(leaderUserId);
  if (!leader.ok) return leader;
  const member = await prisma.agentProfile.findUnique({
    where: { userId: memberUserId },
    include: { user: { select: { name: true, phone: true } } }
  });
  if (!member || member.leaderId !== leader.data.id) return fail(404, "Member not found");
  return ok({ leader: leader.data, member });
}

export async function loadTeamMember(leaderUserId: string, memberUserId: string) {
  const found = await memberForLeader(leaderUserId, memberUserId);
  if (!found.ok) return found;
  const stats = await memberStats(leaderUserId, [memberUserId]);
  const sales = await prisma.shopCommission.findMany({
    where: { agentId: memberUserId, kind: { in: SALE_KINDS } },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const nameOf = await businessNameLookup(sales);
  return ok({
    id: found.data.member.userId,
    name: found.data.member.user.name || "Agent",
    phoneMasked: maskPhone(found.data.member.user.phone),
    status: found.data.member.status,
    sharePercent: found.data.member.sharePercent,
    monthSalesPaise: stats.sales.get(memberUserId) || 0,
    monthOverridePaise: stats.overrides.get(memberUserId) || 0,
    businesses: stats.businesses.get(memberUserId) || 0,
    sales: sales.map((row) => ({
      id: row.id,
      kind: publicCommissionKind(row.kind, row.saleKind),
      amountPaise: row.amountPaise,
      businessName: nameOf(row),
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }))
  });
}

export async function patchTeamMember(
  leaderUserId: string,
  memberUserId: string,
  input: { sharePercent?: number; action?: "pause" | "resume" }
): Promise<ServiceResult<{ status: string } | { sharePercent: number }>> {
  const found = await memberForLeader(leaderUserId, memberUserId);
  if (!found.ok) return found;
  if (input.action) {
    if (input.action === "resume" && found.data.member.status === "PENDING") {
      return fail(400, "This member is waiting for approval");
    }
    const status = input.action === "pause" ? "PAUSED" : "ACTIVE";
    await prisma.agentProfile.update({
      where: { id: found.data.member.id },
      data: { status, active: status === "ACTIVE" }
    });
    return ok({ status });
  }
  const settings = await getTeamProgramSettings();
  const share = input.sharePercent ?? -1;
  if (share < settings.minSharePercent || share > settings.maxSharePercent) {
    return fail(400, `Share must be between ${settings.minSharePercent} and ${settings.maxSharePercent}`);
  }
  await prisma.agentProfile.update({ where: { id: found.data.member.id }, data: { sharePercent: share } });
  return ok({ sharePercent: share });
}

export async function joinTeam(userId: string, codeRaw: string): Promise<ServiceResult<{ status: "PENDING" | "ACTIVE" | "PAUSED"; leaderName: string }>> {
  const code = normalizeCode(codeRaw);
  if (!code) return fail(400, "Enter a valid team code");
  const invite = await prisma.agentInvite.findUnique({
    where: { code },
    include: { leader: { include: { user: { select: { name: true } } } } }
  });
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    return fail(400, "This invite is no longer valid");
  }
  if (invite.leader.userId === userId) return fail(400, "You cannot join your own team");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return fail(404, "Account not found");
  if (user.role === "ADMIN") return fail(400, "An admin cannot join a team");
  const settings = await getTeamProgramSettings();
  const depth = invite.leader.depth + 1;
  if (depth > settings.maxTeamDepth) return fail(400, "This team cannot add another level");
  let cursor = invite.leader.leaderId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const ancestor = await prisma.agentProfile.findUnique({
      where: { id: cursor },
      select: { userId: true, leaderId: true }
    });
    if (!ancestor) break;
    if (ancestor.userId === userId) return fail(400, "You cannot join a team under you");
    cursor = ancestor.leaderId;
  }
  const existing = await prisma.agentProfile.findUnique({ where: { userId } });
  if (existing?.leaderId) return fail(400, "You are already on a team");
  if (existing) {
    const children = await prisma.agentProfile.count({ where: { leaderId: existing.id } });
    if (children > 0) return fail(400, "Move this team from the admin page");
  }
  const status = settings.autoApproveSubAgents ? "ACTIVE" : "PENDING";
  const agentCode = existing ? null : await freshAgentCode();
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.agentInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      if (claimed.count !== 1) throw new Error("used");
      await tx.user.update({ where: { id: userId }, data: { role: "AGENT" } });
      if (existing) {
        await tx.agentProfile.update({
          where: { id: existing.id },
          data: { leaderId: invite.leader.id, depth, status, active: status === "ACTIVE" }
        });
      } else {
        await tx.agentProfile.create({
          data: {
            userId,
            code: agentCode || makeCode(8),
            leaderId: invite.leader.id,
            depth,
            status,
            active: status === "ACTIVE",
            upiId: "",
            city: ""
          }
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "used") return fail(400, "This invite is no longer valid");
    throw error;
  }
  return ok({ status, leaderName: invite.leader.user.name || "Leader" });
}

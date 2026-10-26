/**
 * Credit the paying owner's agent after a confirmed plan payment.
 * Uses a commission rule when one matches. Otherwise the shop percent still applies.
 */
import { prisma } from "@/lib/db";
import { getShopCheckoutConfig } from "@/lib/settings";
import { commissionPaise, soleAgentId } from "./commission";
import { creditPooledCommission } from "../plans/pool";
import { commissionAmount, holdUntil, pickCommissionRule, renewalStillPays, type CommissionRuleView } from "../plans/commission-rules";
import { getPlanProgramSettings } from "../plans/settings";

function asView(rule: {
  agentId: string | null;
  planId: string | null;
  hardware: boolean;
  active: boolean;
  firstBasis: "PERCENT" | "FLAT";
  firstPercent: number;
  firstFlatPaise: number;
  renewalBasis: "PERCENT" | "FLAT";
  renewalPercent: number;
  renewalFlatPaise: number;
  renewalMonths: number | null;
}): CommissionRuleView {
  return rule;
}

export async function creditRenewalCommission(ownerId: string, paymentId: string, amountPaise: number) {
  if (amountPaise <= 0) return;
  const businesses = await prisma.business.findMany({
    where: { ownerId, archived: false },
    select: { agentId: true }
  });
  let agentId = soleAgentId(businesses.map((business) => business.agentId));
  if (!agentId && businesses.every((business) => !business.agentId)) {
    const attribution = await prisma.signupAttribution.findUnique({
      where: { userId: ownerId },
      select: { agentId: true }
    });
    agentId = attribution?.agentId || null;
  }
  if (!agentId || agentId === ownerId) return;

  const [payment, settings, earlier] = await Promise.all([
    prisma.payment.findUnique({ where: { id: paymentId }, select: { planId: true } }),
    getPlanProgramSettings(),
    prisma.payment.count({
      where: { userId: ownerId, status: "COMPLETED", id: { not: paymentId }, amount: { gt: 0 } }
    })
  ]);
  const saleKind = earlier > 0 ? "RENEWAL" : "FIRST";
  const rules = await prisma.commissionRule.findMany({ where: { active: true, hardware: false } });
  const rule = pickCommissionRule(
    rules.map(asView),
    { agentId, planId: payment?.planId || null, hardware: false }
  );

  let amount = 0;
  let percent = 0;
  let basis: "PERCENT" | "FLAT" = "PERCENT";
  let flatPaise = 0;
  if (!rule) {
    const config = await getShopCheckoutConfig();
    percent = config.commissionPercent;
    amount = commissionPaise(amountPaise, percent);
  } else if (saleKind === "RENEWAL") {
    const first = await prisma.payment.findFirst({
      where: { userId: ownerId, status: "COMPLETED", amount: { gt: 0 } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    });
    if (first && !renewalStillPays({ renewalMonths: rule.renewalMonths, firstPaidAt: first.createdAt })) return;
    basis = rule.renewalBasis;
    percent = rule.renewalPercent;
    flatPaise = rule.renewalFlatPaise;
    amount = commissionAmount(basis, percent, flatPaise, amountPaise);
  } else {
    basis = rule.firstBasis;
    percent = rule.firstPercent;
    flatPaise = rule.firstFlatPaise;
    amount = commissionAmount(basis, percent, flatPaise, amountPaise);
  }
  if (amount <= 0) return;
  await creditPooledCommission({
    sellerId: agentId,
    sellerKind: saleKind === "FIRST" ? "SALE" : "RENEWAL",
    poolPaise: amount,
    sourceId: paymentId,
    paymentId,
    planId: payment?.planId || null,
    percent,
    basis,
    flatPaise,
    saleKind,
    holdUntil: holdUntil(new Date(), settings.commissionHoldDays)
  });
}

import { prisma } from "../db";
import { commissionPaise } from "../shop/commission";
import { commissionAmount, pickCommissionRule, type CommissionRuleView } from "./commission-rules";

export async function hardwareCommissionSnapshot(agentId: string, totalPaise: number, fallbackPercent: number) {
  const rules = await prisma.commissionRule.findMany({ where: { active: true, hardware: true } });
  const view: CommissionRuleView[] = rules.map((rule) => ({
    agentId: rule.agentId,
    planId: rule.planId,
    hardware: rule.hardware,
    active: rule.active,
    firstBasis: rule.firstBasis,
    firstPercent: rule.firstPercent,
    firstFlatPaise: rule.firstFlatPaise,
    renewalBasis: rule.renewalBasis,
    renewalPercent: rule.renewalPercent,
    renewalFlatPaise: rule.renewalFlatPaise,
    renewalMonths: rule.renewalMonths
  }));
  const rule = pickCommissionRule(view, { agentId, planId: null, hardware: true });
  if (!rule) {
    return {
      percent: fallbackPercent,
      paise: commissionPaise(totalPaise, fallbackPercent),
      basis: "PERCENT" as const,
      flatPaise: 0
    };
  }
  return {
    percent: rule.firstPercent,
    paise: commissionAmount(rule.firstBasis, rule.firstPercent, rule.firstFlatPaise, totalPaise),
    basis: rule.firstBasis,
    flatPaise: rule.firstFlatPaise
  };
}

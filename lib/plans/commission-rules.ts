import { addMonths } from "date-fns";
import { commissionPaise } from "../shop/commission";

export type CommissionBasisName = "PERCENT" | "FLAT";

export type CommissionRuleView = {
  agentId: string | null;
  planId: string | null;
  hardware: boolean;
  active: boolean;
  firstBasis: CommissionBasisName;
  firstPercent: number;
  firstFlatPaise: number;
  renewalBasis: CommissionBasisName;
  renewalPercent: number;
  renewalFlatPaise: number;
  renewalMonths: number | null;
};

/**
 * Per-plan override beats a per-agent override, which beats the default.
 * A rule that names both the agent and the plan is the most specific.
 */
export function pickCommissionRule(
  rules: readonly CommissionRuleView[],
  query: { agentId: string; planId: string | null; hardware: boolean }
): CommissionRuleView | null {
  const active = rules.filter((rule) => rule.active && rule.hardware === query.hardware);
  const planId = query.planId;
  const ranked = [
    active.find((rule) => rule.agentId === query.agentId && !!planId && rule.planId === planId),
    active.find((rule) => !rule.agentId && !!planId && rule.planId === planId),
    active.find((rule) => rule.agentId === query.agentId && !rule.planId),
    active.find((rule) => !rule.agentId && !rule.planId)
  ];
  return ranked.find((rule): rule is CommissionRuleView => !!rule) ?? null;
}

export function commissionAmount(basis: CommissionBasisName, percent: number, flatPaise: number, basePaise: number) {
  if (basis === "FLAT") return Math.max(0, Math.floor(flatPaise));
  return commissionPaise(basePaise, percent);
}

export function renewalStillPays(input: { renewalMonths: number | null; firstPaidAt: Date; now?: Date }) {
  if (input.renewalMonths == null) return true;
  const months = Math.max(0, Math.floor(input.renewalMonths));
  if (months === 0) return false;
  const now = input.now ?? new Date();
  return now.getTime() <= addMonths(input.firstPaidAt, months).getTime();
}

export function holdUntil(now: Date, days: number) {
  const hold = Math.max(0, Math.floor(days));
  return new Date(now.getTime() + hold * 24 * 60 * 60 * 1000);
}

export function readyToApprove(status: string, until: Date | null, now: Date) {
  if (status !== "PENDING") return false;
  if (!until) return true;
  return until.getTime() <= now.getTime();
}

export function commissionKey(agentId: string, kind: "ORDER" | "RENEWAL", sourceId: string) {
  return { agentId, kind, sourceId };
}

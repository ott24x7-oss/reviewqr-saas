import type { AgentCommissionKind, AgentStatus } from "./types";

export function formatRupees(paise: number, lang: "en" | "hi" = "en") {
  const amount = Math.round((Number.isFinite(paise) ? paise : 0) / 100);
  return `₹${new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function agentStatusLabel(status: AgentStatus | string, t: Record<string, string>) {
  if (status === "PENDING") return t.agentStatusPending;
  if (status === "PAUSED") return t.agentStatusPaused;
  if (status === "TRIAL") return t.agentStatusTrial;
  if (status === "EXPIRED") return t.agentStatusExpired;
  return t.agentStatusActive;
}

export function commissionStatusLabel(status: string, t: Record<string, string>) {
  if (status === "PENDING") return t.agentStatusPending;
  if (status === "PAID") return t.agentStatusPaid;
  if (status === "APPROVED") return t.agentStatusApproved;
  if (status === "REVERSED") return t.agentStatusReversed;
  return status;
}

export function commissionKindLabel(kind: AgentCommissionKind, t: Record<string, string>) {
  if (kind === "RENEWAL") return t.agentRenewal;
  if (kind === "HARDWARE") return t.agentHardware;
  if (kind === "TEAM_OVERRIDE") return t.agentOverrideKind;
  return t.agentSale;
}

export function formatAgentDate(date: string | null | undefined, lang: "en" | "hi") {
  if (!date) return "—";
  const value = new Date(date);
  if (Number.isNaN(value.valueOf())) return "—";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

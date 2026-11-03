import type { OwnerReferralHome } from "@reviewqr/shared";

export type ReferralStage = OwnerReferralHome["referrals"][number]["stage"];

export function stageForReward(status: string | null | undefined): ReferralStage {
  if (status === "INVITED") return "INVITED";
  if (status === "SIGNED_UP") return "SIGNED_UP";
  if (status === "PENDING") return "PAID";
  if (status === "APPLIED") return "REWARD_ADDED";
  if (status === "REVERSED") return "REVERSED";
  return "SIGNED_UP";
}

export function buildReferralShareText(shareText: OwnerReferralHome["shareText"], lang: "en" | "hi") {
  return lang === "hi" ? shareText.hi : shareText.en;
}

export function formatReferralDate(value: string, lang: "en" | "hi") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function projectedExpiryDisplay(projectedEndsAt: string | null, lang: "en" | "hi") {
  if (!projectedEndsAt) return "";
  const date = formatReferralDate(projectedEndsAt, lang);
  return lang === "hi" ? `→ बढ़कर ${date} तक` : `→ extends to ${date}`;
}

import type { OwnerReferralHome } from "@reviewqr/shared";

export type ReferralStage = OwnerReferralHome["referrals"][number]["stage"];
export type NormalizedReferralHome = OwnerReferralHome & {
  legacyRewards: { id: string; months: number; at: string }[];
  hasRewardDetails: boolean;
  hasYearlyCap: boolean;
  hasCurrentExpiry: boolean;
  hasHoldDays: boolean;
};

type ReferralShareText = Partial<Record<"en" | "hi", string>> | null | undefined;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function optionalDate(value: unknown): string | null {
  return typeof value === "string" && value.trim() && !Number.isNaN(new Date(value).getTime()) ? value : null;
}

export function stageForReward(status: string | null | undefined): ReferralStage {
  const normalized = status?.toUpperCase();
  if (normalized === "INVITED") return "INVITED";
  if (normalized === "SIGNED_UP") return "SIGNED_UP";
  if (normalized === "PAID" || normalized === "PENDING") return "PAID";
  if (normalized === "REWARD_ADDED" || normalized === "APPLIED") return "REWARD_ADDED";
  if (normalized === "REVERSED") return "REVERSED";
  return "SIGNED_UP";
}

export function buildReferralShareText(
  shareText: ReferralShareText,
  lang: "en" | "hi",
  code = "",
  link = ""
) {
  const provided = nonEmptyString(shareText?.[lang]);
  if (provided) return provided;

  const referralCode = nonEmptyString(code);
  const referralLink = nonEmptyString(link);
  if (!referralCode && !referralLink) return "";
  if (lang === "hi") {
    if (referralCode && referralLink) return `मेरा रेफ़रल कोड ${referralCode} इस्तेमाल करके QR24x7 से जुड़ें: ${referralLink}`;
    if (referralCode) return `मेरा रेफ़रल कोड ${referralCode} इस्तेमाल करके QR24x7 से जुड़ें।`;
    return `QR24x7 से जुड़ें: ${referralLink}`;
  }
  if (referralCode && referralLink) return `Join QR24x7 with my referral code ${referralCode}: ${referralLink}`;
  if (referralCode) return `Join QR24x7 with my referral code ${referralCode}.`;
  return `Join QR24x7: ${referralLink}`;
}

/**
 * Older /api/v1/refer responses contain only code, link, and rewards. Keep
 * newer presentation fields optional at the boundary so stale servers remain
 * usable without inventing cap, expiry, or reward details.
 */
export function normalizeReferralHome(raw: unknown): NormalizedReferralHome {
  const source = record(raw);
  const code = nonEmptyString(source.code) ?? "";
  const link = nonEmptyString(source.link) ?? (code ? `https://qr24x7.in/refer/${encodeURIComponent(code)}` : "");
  const suppliedShareText = record(source.shareText);
  const shareText = {
    en: buildReferralShareText(suppliedShareText, "en", code, link),
    hi: buildReferralShareText(suppliedShareText, "hi", code, link)
  };
  const rawReferrals = Array.isArray(source.referrals) ? source.referrals : [];
  const legacyRewards = (Array.isArray(source.rewards) ? source.rewards : []).map((value, index) => {
    const row = record(value);
    return {
      id: nonEmptyString(row.id) ?? `reward-${index}`,
      months: nonNegativeInteger(row.months),
      at: optionalDate(row.at) ?? ""
    };
  });
  const referrals = rawReferrals.map((value, index) => {
    const row = record(value);
    const id = nonEmptyString(row.id) ?? `referral-${index}`;
    const status = nonEmptyString(row.stage) ?? nonEmptyString(row.status);
    return {
      id,
      displayName: nonEmptyString(row.displayName) ?? "",
      stage: stageForReward(status),
      months: nonNegativeInteger(row.months),
      signedUpAt: optionalDate(row.signedUpAt) ?? optionalDate(row.createdAt) ?? "",
      availableOn: optionalDate(row.availableOn),
      appliedAt: optionalDate(row.appliedAt)
    };
  });

  return {
    code,
    link,
    shareText,
    monthsPerReferral: nonNegativeInteger(source.monthsPerReferral),
    bonusDaysForFriend: nonNegativeInteger(source.bonusDaysForFriend),
    holdDays: nonNegativeInteger(source.holdDays),
    maxMonthsPerYear: nonNegativeInteger(source.maxMonthsPerYear),
    monthsEarnedThisYear: nonNegativeInteger(source.monthsEarnedThisYear),
    currentEndsAt: optionalDate(source.currentEndsAt),
    projectedEndsAt: optionalDate(source.projectedEndsAt),
    creditMonths: nonNegativeInteger(source.creditMonths),
    creditDays: nonNegativeInteger(source.creditDays),
    referrals,
    legacyRewards,
    hasRewardDetails: isNonNegativeInteger(source.monthsPerReferral) && isNonNegativeInteger(source.bonusDaysForFriend),
    hasYearlyCap: isNonNegativeInteger(source.maxMonthsPerYear) && isNonNegativeInteger(source.monthsEarnedThisYear),
    hasCurrentExpiry: Object.prototype.hasOwnProperty.call(source, "currentEndsAt")
      && (source.currentEndsAt === null || optionalDate(source.currentEndsAt) !== null),
    hasHoldDays: isNonNegativeInteger(source.holdDays)
  };
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
  if (date === "—") return "";
  return lang === "hi" ? `→ बढ़कर ${date} तक` : `→ extends to ${date}`;
}

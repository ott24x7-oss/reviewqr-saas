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

type ReferralHeroCopy = {
  fallback: string;
  withFriendBonus: string;
  withoutFriendBonus: string;
};

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

function positiveInteger(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function friendDayQuantity(days: number, lang: "en" | "hi"): string {
  if (lang === "hi") return `${days} दिन`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function freeMonthQuantity(months: number, lang: "en" | "hi"): string {
  if (lang === "hi") return `${months} मुफ़्त ${months === 1 ? "महीना" : "महीने"}`;
  return `${months} free ${months === 1 ? "month" : "months"}`;
}

export function buildReferralHeroText(
  bonusDaysForFriend: number | null | undefined,
  monthsPerReferral: number | null | undefined,
  lang: "en" | "hi",
  copy: ReferralHeroCopy
): string {
  const months = positiveInteger(monthsPerReferral);
  if (months === 0) return copy.fallback;

  const days = positiveInteger(bonusDaysForFriend);
  if (days === 0) {
    return copy.withoutFriendBonus.replace("{freeMonths}", freeMonthQuantity(months, lang));
  }
  return copy.withFriendBonus
    .replace("{friendDays}", friendDayQuantity(days, lang))
    .replace("{freeMonths}", freeMonthQuantity(months, lang));
}

function buildFallbackReferralShareText(
  lang: "en" | "hi",
  referralCode: string | null,
  referralLink: string | null,
  bonusDaysForFriend: number,
  monthsPerReferral: number
): string {
  let intro: string;
  if (lang === "hi") {
    if (referralCode && referralLink) intro = `मेरे रेफ़रल कोड ${referralCode} से QR24x7 से जुड़ें।`;
    else if (referralCode) intro = `मेरे रेफ़रल कोड ${referralCode} से QR24x7 से जुड़ें।`;
    else intro = "QR24x7 से जुड़ें।";

    const days = positiveInteger(bonusDaysForFriend);
    const months = positiveInteger(monthsPerReferral);
    if (days === 0 && months === 0) return referralLink ? `${intro}\n${referralLink}` : intro;
    const friendReward = days > 0
      ? `उस बिज़नेस को ${days} बोनस दिन ${days === 1 ? "मिलेगा" : "मिलेंगे"}`
      : "";
    const ownerReward = months > 0
      ? `मुझे अधिकतम ${freeMonthQuantity(months, lang)} ${months === 1 ? "मिलेगा" : "मिलेंगे"}`
      : "";
    const rewards = [friendReward, ownerReward].filter(Boolean).join(" और ");
    const offer = ` आपका बिज़नेस प्लान लेने पर ${rewards}।`;
    return `${intro}${offer}${referralLink ? `\n${referralLink}` : ""}`;
  }

  if (referralCode && referralLink) intro = `Join QR24x7 with my referral code ${referralCode}.`;
  else if (referralCode) intro = `Join QR24x7 with my referral code ${referralCode}.`;
  else intro = "Join QR24x7.";

  const days = positiveInteger(bonusDaysForFriend);
  const months = positiveInteger(monthsPerReferral);
  if (days === 0 && months === 0) return referralLink ? `${intro}\n${referralLink}` : intro;
  const friendReward = days > 0
    ? `you get ${days} bonus ${days === 1 ? "day" : "days"}`
    : "";
  const ownerReward = months > 0
    ? `I get up to ${freeMonthQuantity(months, lang)}`
    : "";
  const rewards = [friendReward, ownerReward].filter(Boolean).join(" and ");
  const offer = ` When your business buys a plan, ${rewards}.`;
  return `${intro}${offer}${referralLink ? `\n${referralLink}` : ""}`;
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
  link = "",
  rewards: { bonusDaysForFriend?: number; monthsPerReferral?: number } = {}
) {
  const provided = nonEmptyString(shareText?.[lang]);
  if (provided) return provided;

  const referralCode = nonEmptyString(code);
  const referralLink = nonEmptyString(link);
  if (!referralCode && !referralLink) return "";
  return buildFallbackReferralShareText(
    lang,
    referralCode,
    referralLink,
    positiveInteger(rewards.bonusDaysForFriend),
    positiveInteger(rewards.monthsPerReferral)
  );
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
  const monthsPerReferral = nonNegativeInteger(source.monthsPerReferral);
  const bonusDaysForFriend = nonNegativeInteger(source.bonusDaysForFriend);
  const shareText = {
    en: buildReferralShareText(suppliedShareText, "en", code, link, { bonusDaysForFriend, monthsPerReferral }),
    hi: buildReferralShareText(suppliedShareText, "hi", code, link, { bonusDaysForFriend, monthsPerReferral })
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
    monthsPerReferral,
    bonusDaysForFriend,
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

export type ReviewPlatform = "google" | "trustpilot";

export type PublicReviewTarget = {
  platform: ReviewPlatform;
  href: string;
  labelEn: string;
  labelHi: string;
};

const LABELS: Record<ReviewPlatform, { labelEn: string; labelHi: string }> = {
  google: { labelEn: "Review on Google", labelHi: "Google पर रिव्यू" },
  trustpilot: { labelEn: "Review on Trustpilot", labelHi: "Trustpilot पर रिव्यू" }
};

/** http(s) only. Rejects javascript: and other schemes stored on a business. */
export function safeReviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function orderedReviewTargets(input: {
  googleReviewUrl?: string | null;
  trustpilotUrl?: string | null;
  reviewPlatform?: string | null;
}): PublicReviewTarget[] {
  const targets: PublicReviewTarget[] = [];
  const google = safeReviewUrl(input.googleReviewUrl);
  if (google) targets.push({ platform: "google", href: google, ...LABELS.google });
  const trustpilot = safeReviewUrl(input.trustpilotUrl);
  if (trustpilot) targets.push({ platform: "trustpilot", href: trustpilot, ...LABELS.trustpilot });
  const preferred: ReviewPlatform = input.reviewPlatform === "trustpilot" ? "trustpilot" : "google";
  return [...targets].sort((a, b) => Number(b.platform === preferred) - Number(a.platform === preferred));
}

/** Public links stay visible for every star unless the owner turned gating on. */
export function showPublicReviewLinks(input: {
  reviewGating: boolean;
  rating: number;
  ratingThreshold: number;
  hasPublicUrl: boolean;
}): boolean {
  if (!input.hasPublicUrl) return false;
  if (!input.reviewGating) return true;
  return input.rating >= input.ratingThreshold;
}

/**
 * A review counts as redirected only when the customer opened a public link.
 * Gating-on keeps the old analytics rule: a high rating with no written feedback.
 */
export function draftWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function appendHint(current: string, hint: string) {
  const next = hint.trim();
  if (!next) return current;
  const base = current.trim();
  return base ? `${base} ${next}` : next;
}

export function reviewWasRedirected(input: {
  reviewGating: boolean;
  rating: number;
  ratingThreshold: number;
  hasFeedback: boolean;
  openedPublicReview: boolean;
}): boolean {
  if (!input.reviewGating) return input.openedPublicReview;
  return input.rating >= input.ratingThreshold && !input.hasFeedback;
}

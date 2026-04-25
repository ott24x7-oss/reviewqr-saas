import DOMPurify from "isomorphic-dompurify";

/**
 * Strip HTML and dangerous content from user-submitted feedback.
 * Keeps simple line breaks but removes anything that could be XSS.
 */
export function sanitizeFeedback(input: string) {
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  return cleaned
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}

export function sanitizeText(input: string, maxLength = 200) {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .trim()
    .slice(0, maxLength);
}

/**
 * Check if a feedback message is likely a duplicate of recent ones
 * (basic content similarity for spam detection).
 */
export function isLikelyDuplicate(a: string, b: string) {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/\s+/g, " ").trim();
  const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (na === nb) return true;
  if (na.length < 20 || nb.length < 20) return false;
  // Simple Jaccard on word sets
  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && intersection / union > 0.85;
}

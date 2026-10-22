/** Platform name and tagline. Internal package names and storage keys stay as they are. */
export const DEFAULT_BRAND_NAME = "QR24x7";
export const DEFAULT_BRAND_TAGLINE = "Scan. Tap. Grow.";

/**
 * A saved settings row can still hold the previous product name.
 * The literal stays in this module so reads can map that default onto
 * DEFAULT_BRAND_NAME without printing it anywhere else.
 */
export const PREVIOUS_BRAND_NAME = "ReviewQR";

const PREVIOUS_TAGLINES = new Set([
  "Every customer can leave a public review.",
  "Every customer can leave a public Google or Trustpilot review."
]);

/** Empty and the previous default both resolve to the current brand. */
export function brandNameOrDefault(value: string | null | undefined, fallback = DEFAULT_BRAND_NAME) {
  const name = (value ?? "").trim();
  if (!name || name === PREVIOUS_BRAND_NAME) return fallback;
  return name;
}

/** Empty and the previous default sentences resolve to the current tagline. */
export function brandTaglineOrDefault(value: string | null | undefined, fallback = DEFAULT_BRAND_TAGLINE) {
  const tagline = (value ?? "").trim();
  if (!tagline || PREVIOUS_TAGLINES.has(tagline)) return fallback;
  return tagline;
}

/** Replaces a saved display name that still uses the previous brand. The mailbox itself is unchanged. */
export function brandFromOrDefault(value: string | null | undefined, fallback: string) {
  const from = (value ?? "").trim();
  if (!from) return fallback;
  if (from === PREVIOUS_BRAND_NAME || from.startsWith(`${PREVIOUS_BRAND_NAME} <`) || from.startsWith(`${PREVIOUS_BRAND_NAME}<`)) {
    return from.replace(PREVIOUS_BRAND_NAME, DEFAULT_BRAND_NAME);
  }
  return from;
}

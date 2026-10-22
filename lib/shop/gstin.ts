/** Indian GSTIN. Empty is allowed when the buyer does not want a B2B invoice. */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstin(value: string | null | undefined) {
  const next = (value || "").trim().toUpperCase();
  return next || null;
}

export function gstinError(value: string | null | undefined) {
  const gstin = normalizeGstin(value);
  if (!gstin) return null;
  if (!GSTIN.test(gstin)) return "GSTIN must be 15 characters";
  return null;
}

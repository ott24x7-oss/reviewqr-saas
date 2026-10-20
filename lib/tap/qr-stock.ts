import { isLookupCode } from "./ids";

export type QrStatusName = "UNASSIGNED" | "ACTIVE" | "DISABLED";

export type QrClaim = {
  status: QrStatusName;
  businessId: string | null;
  ownerId: string | null;
};

export type ClaimTarget = {
  businessId: string;
  businessName: string;
  ownerId: string;
};

export type ClaimResult =
  | { action: "activate"; message: string }
  | { action: "already"; message: string }
  | { action: "disabled"; message: string }
  | { action: "blocked"; message: string };

/** Public pages treat isActive false as disabled, so stock must stay active. */
export function storedStatus(status: QrStatusName) {
  return { status, isActive: status !== "DISABLED" };
}

export function plainLabel(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Pull a printed code out of a camera read or a pasted /q or /t URL. */
export function codeFromScan(raw: string) {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(/\/[qt]\/([A-Za-z0-9_-]{4,32})(?:[/?#]|$)/i);
  const candidate = fromUrl ? fromUrl[1] : trimmed;
  if (!isLookupCode(candidate)) return null;
  return candidate;
}

/**
 * What an owner may do with a printed code.
 * A code on any other business, including another business they own, needs an admin.
 */
export function claimDecision(qr: QrClaim, target: ClaimTarget): ClaimResult {
  if (qr.status === "DISABLED") {
    return { action: "disabled", message: "This QR is disabled" };
  }
  if (qr.status === "UNASSIGNED" || !qr.businessId) {
    return { action: "activate", message: `Activate for ${target.businessName}?` };
  }
  if (qr.businessId === target.businessId) {
    return { action: "already", message: "This QR is already active for this business" };
  }
  return { action: "blocked", message: "Contact support to reassign" };
}

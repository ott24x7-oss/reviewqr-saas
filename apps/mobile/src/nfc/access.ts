const FIELD_ROLES = new Set(["AGENT", "AGENCY", "ADMIN"]);

/** Staff-only accounts stay out. A USER must own a business. Field roles may write. */
export function canWriteNfc(role: string | null | undefined, ownsBusiness: boolean) {
  if (!role || role === "STAFF") return false;
  if (FIELD_ROLES.has(role)) return true;
  return role === "USER" && ownsBusiness;
}

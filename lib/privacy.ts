/**
 * DPDP helpers that do not touch the database.
 * Contact fields are kept only when the customer checked the consent box.
 * Account deletion anonymizes the user row and leaves Payment rows alone.
 */

export function reviewContact(input: {
  consent: boolean;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const blank = { customerName: null, customerEmail: null, customerPhone: null, consented: false };
  if (!input.consent) return blank;
  const name = input.name?.trim() || null;
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  return {
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    consented: true
  };
}

/** Email written onto an anonymized user. Unique because it includes the id. */
export function anonymizedEmail(userId: string) {
  return `deleted+${userId}@invalid.local`;
}

export function anonymizedUserPatch(userId: string, now = new Date()) {
  return {
    deletedAt: now,
    email: anonymizedEmail(userId),
    name: null,
    phone: null,
    password: null,
    image: null,
    emailVerified: null,
    whiteLabelLogo: null,
    whiteLabelName: null,
    whiteLabelDomain: null
  };
}

/** Rows the delete route must not remove. Tax invoices stay on Payment. */
export const ACCOUNT_DELETE_RETAINS = ["Payment"] as const;

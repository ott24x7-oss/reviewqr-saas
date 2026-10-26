import { findUserByPhone, phoneKey, requestPurposeOtp, verifyPurposeOtp } from "@/lib/otp";

const PURPOSE = "admin-login";

/**
 * A well-formed number always gets the same success shape.
 * Missing accounts, other roles, and a failed send do not get a code.
 */
export async function requestAdminOtp(rawPhone: string) {
  const key = phoneKey(rawPhone);
  if (!key) return { ok: false as const, error: "Enter a valid mobile number" };

  const user = await findUserByPhone(rawPhone);
  if (!user || user.deletedAt || user.suspendedAt || user.role !== "ADMIN" || !user.phone) {
    return { ok: true as const, issuedCode: null as string | null };
  }

  const sent = await requestPurposeOtp({
    identifier: key,
    phone: user.phone,
    purpose: PURPOSE,
    email: user.email
  });
  if (!sent.ok) return { ok: true as const, issuedCode: null as string | null };
  return { ok: true as const, issuedCode: sent.issuedCode };
}

export async function verifyAdminOtp(rawPhone: string, code: string) {
  const key = phoneKey(rawPhone);
  if (!key) return { ok: false as const, error: "Invalid code" };
  const checked = await verifyPurposeOtp(key, PURPOSE, code);
  if (!checked.ok) return { ok: false as const, error: "Invalid code" };
  const user = await findUserByPhone(rawPhone);
  if (!user || user.deletedAt || user.suspendedAt || user.role !== "ADMIN") {
    return { ok: false as const, error: "Invalid code" };
  }
  return {
    ok: true as const,
    user: { id: user.id, role: user.role, email: user.email, name: user.name, phone: user.phone }
  };
}

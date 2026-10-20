import crypto from "crypto";

/** SHA-256 hex of a secret. Reset links and OTPs store this, never the raw value. */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function randomOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

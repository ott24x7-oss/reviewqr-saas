/**
 * Envelope encryption for secrets stored in the AppSetting table (IMAP pass,
 * AI/gateway keys, SMTP pass, WhatsApp/Turnstile tokens).
 *
 * Rollout is incremental and backward-compatible:
 *   - If APP_ENCRYPTION_KEY is NOT set, encryptSecret is a no-op (returns the
 *     plaintext) — behaviour is exactly as before. decryptSecret returns any
 *     non-prefixed value as-is, so existing plaintext rows keep working.
 *   - Once APP_ENCRYPTION_KEY is set, new writes are AES-256-GCM encrypted and
 *     tagged with the ENC_PREFIX. Old plaintext rows are transparently upgraded
 *     on their next save.
 *
 * Set APP_ENCRYPTION_KEY to a long random string (any length; it's hashed to a
 * 32-byte key). Losing/rotating it makes previously-encrypted secrets
 * unrecoverable — treat it like any other production secret.
 */
import crypto from "crypto";

const ENC_PREFIX = "enc:v1:";

function keyOrNull(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) return null;
  // Derive a fixed 32-byte key from an arbitrary-length passphrase.
  return crypto.createHash("sha256").update(raw).digest();
}

export function isEncryptionEnabled(): boolean {
  return keyOrNull() !== null;
}

/** Encrypt a secret string. No-op (returns input) when no key is configured. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext; // already encrypted
  const key = keyOrNull();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decrypt a value produced by encryptSecret. Non-encrypted values pass through. */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(ENC_PREFIX)) return stored; // legacy plaintext
  const key = keyOrNull();
  if (!key) return ""; // encrypted data but no key available — fail closed
  try {
    const buf = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return ""; // wrong/rotated key or corrupt data — fail closed
  }
}

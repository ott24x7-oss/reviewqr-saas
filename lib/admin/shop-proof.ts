import crypto from "crypto";
import { accessSecret } from "@/lib/auth/access-token";
import { absoluteUrl } from "@/lib/utils";

/** Short enough that a leaked link dies quickly, long enough to render the proof. */
export const SHOP_PROOF_TTL_SEC = 10 * 60;

function payload(orderId: string, lineId: string, exp: number) {
  return `shop-proof|${orderId}|${lineId}|${exp}`;
}

function sign(orderId: string, lineId: string, exp: number, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload(orderId, lineId, exp)).digest("base64url");
}

export function proofContentType(stored: string | null | undefined) {
  if (!stored) return null;
  const data = /^data:([^;,]+)/i.exec(stored);
  if (data) return data[1].toLowerCase();
  if (/\.png($|\?)/i.test(stored)) return "image/png";
  if (/\.jpe?g($|\?)/i.test(stored)) return "image/jpeg";
  if (/\.webp($|\?)/i.test(stored)) return "image/webp";
  if (/\.gif($|\?)/i.test(stored)) return "image/gif";
  if (/\.pdf($|\?)/i.test(stored)) return "application/pdf";
  return null;
}

/**
 * A private proof (a data URL kept on the order line) becomes a 10-minute signed URL.
 * An http(s) URL is already a location, so it is returned as stored.
 */
export function publicShopProof(orderId: string, lineId: string, stored: string | null | undefined, nowSec = Math.floor(Date.now() / 1000)) {
  const contentType = proofContentType(stored);
  if (!stored) return { proofUrl: null as string | null, proofContentType: null as string | null };
  if (/^https?:\/\//i.test(stored)) return { proofUrl: stored, proofContentType: contentType };
  const secret = accessSecret();
  if (!secret) return { proofUrl: null as string | null, proofContentType: contentType };
  const exp = nowSec + SHOP_PROOF_TTL_SEC;
  const sig = sign(orderId, lineId, exp, secret);
  const path = `/api/shop-proof?order=${encodeURIComponent(orderId)}&line=${encodeURIComponent(lineId)}&exp=${exp}&sig=${sig}`;
  return { proofUrl: absoluteUrl(path), proofContentType: contentType };
}

export function shopProofSignatureOk(orderId: string, lineId: string, expRaw: string | null, sig: string | null, nowSec = Math.floor(Date.now() / 1000)) {
  const secret = accessSecret();
  if (!secret || !expRaw || !sig || !/^\d+$/.test(expRaw)) return false;
  const exp = Number(expRaw);
  if (exp < nowSec || exp > nowSec + SHOP_PROOF_TTL_SEC + 30) return false;
  const expected = sign(orderId, lineId, exp, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Decode a stored `data:` proof. Anything else is not a file this route can serve. */
export function decodeDataProof(stored: string) {
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i.exec(stored);
  if (!match) return null;
  return { contentType: match[1].toLowerCase(), body: Buffer.from(match[2], "base64") };
}

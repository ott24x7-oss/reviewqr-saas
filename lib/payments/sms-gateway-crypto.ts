import { createHmac, timingSafeEqual } from "node:crypto";

/** Same wire format as GatewayApi.java: HMAC-SHA256(key UTF-8, rawBody + ':' + timestamp). */
export function smsGatewaySignature(signingKey: string, rawBody: string | Buffer, timestamp: string): string {
  return createHmac("sha256", Buffer.from(signingKey, "utf8"))
    .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8"))
    .update(Buffer.from(`:${timestamp}`, "utf8"))
    .digest("hex");
}

export function verifySmsGatewaySignature(input: {
  signingKey: string;
  rawBody: string | Buffer;
  timestamp: string;
  signature: string;
  nowMs?: number;
  windowMs?: number;
}): boolean {
  if (!/^\d{10,16}$/.test(input.timestamp) || !/^[a-f0-9]{64}$/i.test(input.signature)) return false;
  const signedAt = Number(input.timestamp);
  const now = input.nowMs ?? Date.now();
  if (!Number.isSafeInteger(signedAt) || Math.abs(now - signedAt) > (input.windowMs ?? 30 * 60_000)) return false;
  const wanted = Buffer.from(smsGatewaySignature(input.signingKey, input.rawBody, input.timestamp), "hex");
  const supplied = Buffer.from(input.signature, "hex");
  return wanted.length === supplied.length && timingSafeEqual(wanted, supplied);
}

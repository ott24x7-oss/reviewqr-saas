import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret() { return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""; }

export function createGmailOAuthState(adminId: string) {
  const key = secret();
  if (!key) throw new Error("Admin session signing secret is not configured.");
  const payload = Buffer.from(JSON.stringify({ adminId, at: Date.now(), nonce: randomBytes(16).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyGmailOAuthState(state: string, adminId: string) {
  const key = secret();
  const [payload, supplied] = state.split(".");
  if (!key || !payload || !/^[a-f0-9]{64}$/i.test(supplied || "")) return false;
  const wanted = createHmac("sha256", key).update(payload).digest();
  const actual = Buffer.from(supplied, "hex");
  if (actual.length !== wanted.length || !timingSafeEqual(wanted, actual)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.adminId === adminId && Number.isFinite(value.at) && Date.now() - value.at < 10 * 60_000;
  } catch { return false; }
}

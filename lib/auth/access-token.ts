import crypto from "crypto";

/** Plain key/value env so callers (and tests) can pass a small object. */
type EnvLike = Record<string, string | undefined>;

export const ACCESS_TTL_SEC = 15 * 60;
export const ADMIN_ACCESS_TTL_SEC = 10 * 60;
export const STEP_UP_TTL_SEC = 5 * 60;

export type AccessClaims = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
  aud?: string;
  deviceId?: string;
  /** Step-up only: the one admin action this token confirms. */
  act?: string;
  /** Step-up only: single-use id, recorded when the token is spent. */
  jti?: string;
  /** Refresh session that issued this access token. Phone recovery keeps this session. */
  sid?: string;
};

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

export function accessSecret(env: EnvLike = process.env): string | null {
  const secret = env.AUTH_TOKEN_SECRET || "";
  if (secret.length < 16) return null;
  return secret;
}

export function signAccessToken(
  claims: { sub: string; role: string; aud?: string; deviceId?: string; act?: string; jti?: string; sid?: string },
  now = Math.floor(Date.now() / 1000),
  env: EnvLike = process.env,
  ttlSec = ACCESS_TTL_SEC
) {
  const secret = accessSecret(env);
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is not set");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body: Record<string, string | number> = {
    sub: claims.sub,
    role: claims.role,
    iat: now,
    exp: now + ttlSec
  };
  if (claims.aud) body.aud = claims.aud;
  if (claims.deviceId) body.deviceId = claims.deviceId;
  if (claims.act) body.act = claims.act;
  if (claims.jti) body.jti = claims.jti;
  if (claims.sid) body.sid = claims.sid;
  const payload = b64url(JSON.stringify(body));
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyAccessToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
  env: EnvLike = process.env
): AccessClaims | null {
  const secret = accessSecret(env);
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  if (!header || !payload || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let headerJson: { alg?: string };
  let body: AccessClaims;
  try {
    headerJson = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (headerJson.alg !== "HS256") return null;
  if (!body?.sub || typeof body.role !== "string") return null;
  if (typeof body.exp !== "number" || body.exp <= now) return null;
  if (body.sid != null && typeof body.sid !== "string") return null;
  return body;
}

/** Returns the raw bearer token, or null when the header is missing or malformed. */
export function readBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

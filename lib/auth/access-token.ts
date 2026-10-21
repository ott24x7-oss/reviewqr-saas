import crypto from "crypto";

export const ACCESS_TTL_SEC = 15 * 60;

export type AccessClaims = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

export function accessSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.AUTH_TOKEN_SECRET || "";
  if (secret.length < 16) return null;
  return secret;
}

export function signAccessToken(
  claims: { sub: string; role: string },
  now = Math.floor(Date.now() / 1000),
  env: NodeJS.ProcessEnv = process.env
) {
  const secret = accessSecret(env);
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is not set");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: claims.sub,
      role: claims.role,
      iat: now,
      exp: now + ACCESS_TTL_SEC
    })
  );
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyAccessToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
  env: NodeJS.ProcessEnv = process.env
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
  return body;
}

/** Returns the raw bearer token, or null when the header is missing or malformed. */
export function readBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

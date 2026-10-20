/**
 * Rate limiter. Falls back to in-memory; uses Prisma RateLimit table
 * when DATABASE_URL is configured for cross-instance correctness.
 *
 * Use the in-memory map for the public review page burst protection
 * (it's local to each Railway replica, but spam usually comes from
 * the same IP) and the DB for cross-replica counters where needed.
 */
import crypto from "crypto";
import { prisma } from "./db";
import { getTurnstileConfig } from "./settings";

type Bucket = { count: number; expiresAt: number };
const memory = new Map<string, Bucket>();

export type RateLimitOpts = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function rateLimit({ key, limit, windowSeconds }: RateLimitOpts) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Memory check first (fast-path)
  const existing = memory.get(key);
  if (existing && existing.expiresAt > now) {
    if (existing.count >= limit) {
      return {
        ok: false as const,
        remaining: 0,
        retryAfter: Math.ceil((existing.expiresAt - now) / 1000)
      };
    }
    existing.count += 1;
    return { ok: true as const, remaining: limit - existing.count };
  }

  memory.set(key, { count: 1, expiresAt: now + windowMs });
  // Lazy cleanup
  if (memory.size > 5000) {
    for (const [k, v] of memory) {
      if (v.expiresAt < now) memory.delete(k);
    }
  }
  return { ok: true as const, remaining: limit - 1 };
}

export async function rateLimitDb({ key, limit, windowSeconds }: RateLimitOpts) {
  const expiresAt = new Date(Date.now() + windowSeconds * 1000);
  try {
    // Reset an expired window in the same statement. The old upsert incremented
    // first, so a stale row could deny a request that should have started fresh.
    const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
      INSERT INTO "RateLimit" ("id", "key", "count", "expiresAt")
      VALUES (${crypto.randomUUID()}, ${key}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."expiresAt" <= NOW() THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" <= NOW() THEN ${expiresAt}
          ELSE "RateLimit"."expiresAt"
        END
      RETURNING "count", "expiresAt"
    `;
    const row = rows[0];
    if (!row) return { ok: true as const, remaining: limit - 1 };
    if (row.count > limit) {
      const exp = row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
      return {
        ok: false as const,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil((exp.getTime() - Date.now()) / 1000))
      };
    }
    return { ok: true as const, remaining: limit - row.count };
  } catch {
    return rateLimit({ key, limit, windowSeconds });
  }
}

/**
 * Verify Cloudflare Turnstile (preferred over reCAPTCHA in India for
 * faster load and no Google dependency).
 */
/** Missing token is a failure only when a secret is configured (admin setting, then env). */
export function turnstileRequired(secretConfigured: boolean, token: string | undefined | null) {
  if (!secretConfigured) return "skip" as const;
  if (!token) return "missing" as const;
  return "verify" as const;
}

export async function verifyTurnstile(token: string | undefined, ip?: string) {
  const secret = (await getTurnstileConfig()).secretKey;
  const decision = turnstileRequired(!!secret, token);
  if (decision === "skip") return { ok: true, skipped: true as const };
  if (decision === "missing" || !token) {
    return { ok: false, skipped: false as const, error: "missing_token" };
  }
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const json = await res.json().catch(() => ({}));
  return { ok: !!json.success, error: json["error-codes"]?.[0] };
}

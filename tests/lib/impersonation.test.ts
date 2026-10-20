import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessRole, allows } from "../../lib/tenant";
import { googleReviewLink } from "../../lib/places";
import {
  IMPERSONATION_MAX_AGE_SEC,
  IMPERSONATION_TTL_MS,
  canImpersonateTarget,
  impersonationAllowed,
  impersonationCookieOptions,
  openImpersonation,
  sealImpersonation
} from "../../lib/impersonation";

const previousSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-impersonation";
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = previousSecret;
});

describe("impersonation cookie", () => {
  const now = 1_700_000_000_000;

  it("round-trips a sealed payload", () => {
    const token = sealImpersonation({ impersonatorId: "admin_1", targetUserId: "user_2" }, now);
    expect(openImpersonation(token, now + 1_000)).toEqual({
      impersonatorId: "admin_1",
      targetUserId: "user_2",
      exp: now + IMPERSONATION_TTL_MS
    });
  });

  it("rejects a flipped ciphertext byte", () => {
    const token = sealImpersonation({ impersonatorId: "admin_1", targetUserId: "user_2" }, now);
    const buf = Buffer.from(token, "base64url");
    buf[buf.length - 1] = buf[buf.length - 1] ^ 0xff;
    expect(openImpersonation(buf.toString("base64url"), now)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = sealImpersonation({ impersonatorId: "admin_1", targetUserId: "user_2" }, now);
    expect(openImpersonation(token, now + IMPERSONATION_TTL_MS - 1)?.targetUserId).toBe("user_2");
    expect(openImpersonation(token, now + IMPERSONATION_TTL_MS)).toBeNull();
  });

  it("allows the cookie only for the issuing admin", () => {
    const payload = openImpersonation(
      sealImpersonation({ impersonatorId: "admin_1", targetUserId: "user_2" }, now),
      now
    );
    expect(impersonationAllowed({ id: "admin_1", role: "ADMIN" }, payload, now)).toBe(true);
    expect(impersonationAllowed({ id: "admin_1", role: "USER" }, payload, now)).toBe(false);
    expect(impersonationAllowed({ id: "other_admin", role: "ADMIN" }, payload, now)).toBe(false);
    expect(impersonationAllowed({ id: "admin_1", role: "ADMIN" }, null, now)).toBe(false);

    const self = openImpersonation(
      sealImpersonation({ impersonatorId: "admin_1", targetUserId: "admin_1" }, now),
      now
    );
    expect(impersonationAllowed({ id: "admin_1", role: "ADMIN" }, self, now)).toBe(false);
  });

  it("refuses another admin and keeps a fixed 30 minute cookie", () => {
    expect(canImpersonateTarget("ADMIN")).toBe(false);
    expect(canImpersonateTarget("USER")).toBe(true);
    expect(canImpersonateTarget("AGENCY")).toBe(true);
    expect(canImpersonateTarget("STAFF")).toBe(true);
    const options = impersonationCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(IMPERSONATION_MAX_AGE_SEC);
    expect(options.maxAge).toBe(30 * 60);
  });
});

describe("business access", () => {
  it("lets the owner and a manager edit, and lets staff only read", () => {
    expect(accessRole("owner", "owner")).toBe("OWNER");
    expect(accessRole("owner", "owner", "STAFF")).toBe("OWNER");
    expect(accessRole("owner", "mgr", "MANAGER")).toBe("MANAGER");
    expect(accessRole("owner", "staff", "STAFF")).toBe("STAFF");
    expect(accessRole("owner", "stranger", null)).toBeNull();
    expect(allows("OWNER", "manage")).toBe(true);
    expect(allows("MANAGER", "manage")).toBe(true);
    expect(allows("MANAGER", "read")).toBe(true);
    expect(allows("STAFF", "manage")).toBe(false);
    expect(allows("STAFF", "read")).toBe(true);
    expect(allows(null, "read")).toBe(false);
  });
});

describe("google review link", () => {
  it("builds the writereview url from a place id", () => {
    expect(googleReviewLink("ChIJ abc")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJ%20abc"
    );
  });
});

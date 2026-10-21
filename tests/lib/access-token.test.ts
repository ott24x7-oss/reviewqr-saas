import { describe, expect, it } from "vitest";
import { ACCESS_TTL_SEC, readBearer, signAccessToken, verifyAccessToken } from "../../lib/auth/access-token";

const env = { AUTH_TOKEN_SECRET: "unit-test-auth-secret-16" };
const now = 1_700_000_000;

describe("access tokens", () => {
  it("issues a token that verifies for 15 minutes", () => {
    const token = signAccessToken({ sub: "user-1", role: "USER" }, now, env);
    const claims = verifyAccessToken(token, now + 10, env);
    expect(claims).toMatchObject({ sub: "user-1", role: "USER", iat: now, exp: now + ACCESS_TTL_SEC });
    expect(ACCESS_TTL_SEC).toBe(15 * 60);
  });

  it("rejects a tampered payload", () => {
    const token = signAccessToken({ sub: "user-1", role: "USER" }, now, env);
    const [header, , sig] = token.split(".");
    const payload = Buffer.from(JSON.stringify({ sub: "user-2", role: "ADMIN", iat: now, exp: now + 60 })).toString(
      "base64url"
    );
    expect(verifyAccessToken(`${header}.${payload}.${sig}`, now, env)).toBeNull();
  });

  it("rejects an expired token and a short secret", () => {
    const token = signAccessToken({ sub: "user-1", role: "USER" }, now, env);
    expect(verifyAccessToken(token, now + ACCESS_TTL_SEC, env)).toBeNull();
    expect(verifyAccessToken(token, now, { AUTH_TOKEN_SECRET: "short" })).toBeNull();
  });

  it("reads a bearer header and ignores a cookie-style value", () => {
    expect(readBearer("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(readBearer("Basic abc")).toBeNull();
    expect(readBearer(null)).toBeNull();
  });
});

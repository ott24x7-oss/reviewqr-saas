import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from "../../lib/auth/sessions";

describe("refresh session rotation", () => {
  const created: string[] = [];

  afterAll(async () => {
    if (created.length) {
      await prisma.user.deleteMany({ where: { id: { in: created } } });
    }
  });

  it("rotates a token and revokes the family when the old token is reused", async () => {
    const user = await prisma.user.create({
      data: { email: `refresh-${Date.now()}@example.test`, role: "USER" }
    });
    created.push(user.id);

    const issued = await issueTokenPair({ id: user.id, role: user.role }, { deviceName: "Pixel" });
    expect(issued.tokenType).toBe("Bearer");
    expect(issued.expiresIn).toBe(15 * 60);

    const rotated = await rotateRefreshToken(issued.refreshToken);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.tokens.refreshToken).not.toBe(issued.refreshToken);

    const reused = await rotateRefreshToken(issued.refreshToken);
    expect(reused.ok).toBe(false);

    const afterReuse = await rotateRefreshToken(rotated.tokens.refreshToken);
    expect(afterReuse.ok).toBe(false);
  });

  it("accepts logout for an unknown refresh token", async () => {
    await expect(revokeRefreshToken("not-a-real-refresh-token-value")).resolves.toBeUndefined();
  });
});

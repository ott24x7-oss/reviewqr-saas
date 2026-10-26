import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resolveV1User } from "../../lib/api/v1";
import { signAccessToken, STEP_UP_TTL_SEC } from "../../lib/auth/access-token";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

function bearer(token: string) {
  return new NextRequest("http://localhost/api/v1/me", { headers: { authorization: `Bearer ${token}` } });
}

describe("owner API bearer audience", () => {
  const users: string[] = [];

  afterAll(async () => {
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("accepts an owner token and refuses admin or step-up tokens", async () => {
    const admin = await prisma.user.create({ data: { email: `aud-${Date.now()}@example.test`, role: "ADMIN" } });
    users.push(admin.id);
    const owner = await issueTokenPair(admin, { deviceName: "test" });
    const ownerUser = await resolveV1User(bearer(owner.accessToken));
    expect(ownerUser).toMatchObject({ id: admin.id });

    const adminToken = signAccessToken({ sub: admin.id, role: "ADMIN", aud: "admin", deviceId: "device-x" });
    expect(await resolveV1User(bearer(adminToken))).toBe("bad-bearer");
    const stepToken = signAccessToken(
      { sub: admin.id, role: "ADMIN", aud: "admin-step-up", deviceId: "device-x", act: "change_role", jti: "j" },
      undefined,
      undefined,
      STEP_UP_TTL_SEC
    );
    expect(await resolveV1User(bearer(stepToken))).toBe("bad-bearer");
  });
});

import type { TokenPair } from "@reviewqr/shared";
import { prisma } from "../db";
import { hashToken, randomToken } from "../tokens";
import { accessSecret, signAccessToken, ACCESS_TTL_SEC } from "./access-token";
import { decideRefresh } from "./refresh-decision";

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type DeviceMeta = { deviceName?: string | null; userAgent?: string | null };

function clip(value: string | null | undefined, max: number) {
  if (!value) return null;
  return value.slice(0, max);
}

function pairFor(user: { id: string; role: string }, refreshToken: string): TokenPair {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    expiresIn: ACCESS_TTL_SEC,
    tokenType: "Bearer"
  };
}

export function tokenConfigError() {
  return accessSecret() ? null : "AUTH_TOKEN_SECRET is not set";
}

export async function issueTokenPair(user: { id: string; role: string }, meta: DeviceMeta = {}) {
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      familyId: randomToken(),
      tokenHash: hashToken(refreshToken),
      expiresAt,
      deviceName: clip(meta.deviceName, 80),
      userAgent: clip(meta.userAgent, 200)
    }
  });
  return pairFor(user, refreshToken);
}

export type RotateResult =
  | { ok: true; tokens: TokenPair }
  | { ok: false; error: string; status: 401 | 500 };

export async function rotateRefreshToken(raw: string, meta: DeviceMeta = {}): Promise<RotateResult> {
  if (!accessSecret()) return { ok: false, error: "AUTH_TOKEN_SECRET is not set", status: 500 };
  const hash = hashToken(raw);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const row = await tx.refreshSession.findUnique({ where: { tokenHash: hash } });
    const decision = decideRefresh(row, now);
    if (decision.action === "reject" || !row) {
      return { ok: false as const, error: "Refresh token is not valid", status: 401 as const };
    }
    if (decision.action === "revoke-family") {
      await tx.refreshSession.updateMany({
        where: { familyId: decision.familyId, revokedAt: null },
        data: { revokedAt: now }
      });
      return { ok: false as const, error: "Refresh token is not valid", status: 401 as const };
    }

    const claimed = await tx.refreshSession.updateMany({
      where: { id: decision.sessionId, usedAt: null, revokedAt: null },
      data: { usedAt: now, lastUsedAt: now }
    });
    if (claimed.count === 0) {
      await tx.refreshSession.updateMany({
        where: { familyId: decision.familyId, revokedAt: null },
        data: { revokedAt: now }
      });
      return { ok: false as const, error: "Refresh token is not valid", status: 401 as const };
    }

    const user = await tx.user.findUnique({
      where: { id: decision.userId },
      select: { id: true, role: true, deletedAt: true }
    });
    if (!user || user.deletedAt) {
      await tx.refreshSession.updateMany({
        where: { familyId: decision.familyId, revokedAt: null },
        data: { revokedAt: now }
      });
      return { ok: false as const, error: "Refresh token is not valid", status: 401 as const };
    }

    const refreshToken = randomToken();
    await tx.refreshSession.create({
      data: {
        userId: user.id,
        familyId: decision.familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
        deviceName: clip(meta.deviceName, 80) ?? row.deviceName,
        userAgent: clip(meta.userAgent, 200) ?? row.userAgent
      }
    });
    return { ok: true as const, tokens: pairFor(user, refreshToken) };
  });
}

/** Revokes the whole family. An unknown token still succeeds for the caller. */
export async function revokeRefreshToken(raw: string) {
  if (!raw) return;
  const row = await prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row) return;
  await prisma.refreshSession.updateMany({
    where: { familyId: row.familyId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function listActiveSessions(userId: string) {
  return prisma.refreshSession.findMany({
    where: {
      userId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true
    }
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  const row = await prisma.refreshSession.findFirst({ where: { id: sessionId, userId } });
  if (!row) return false;
  if (!row.revokedAt) {
    await prisma.refreshSession.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  }
  return true;
}

export async function revokeAllSessions(userId: string) {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

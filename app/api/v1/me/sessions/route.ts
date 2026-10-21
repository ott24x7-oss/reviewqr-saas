import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { listActiveSessions, revokeAllSessions } from "@/lib/auth/sessions";

export const dynamic = "force-dynamic";

function iso(value: Date | null) {
  return value ? value.toISOString() : null;
}

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const rows = await listActiveSessions(auth.user.id);
  return v1Data({
    items: rows.map((row) => ({
      id: row.id,
      deviceName: row.deviceName,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: iso(row.lastUsedAt),
      expiresAt: row.expiresAt.toISOString()
    })),
    nextCursor: null
  });
}

async function deleteHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  await revokeAllSessions(auth.user.id);
  return v1Data({ ok: true as const });
}
export const GET = observe(getHandler);
export const DELETE = observe(deleteHandler);

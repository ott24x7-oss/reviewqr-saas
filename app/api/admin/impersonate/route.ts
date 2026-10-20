import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import {
  canImpersonateTarget,
  IMPERSONATION_COOKIE,
  impersonationCookieOptions,
  sealImpersonation
} from "@/lib/impersonation";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId || "";
  if (!userId || userId === guard.user.id) {
    return NextResponse.json({ error: "Choose a different user" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!canImpersonateTarget(target.role)) {
    return NextResponse.json({ error: "Cannot sign in as another admin" }, { status: 400 });
  }

  const token = sealImpersonation({ impersonatorId: guard.user.id, targetUserId: target.id });
  await logAudit({
    userId: guard.user.id,
    action: "user.impersonate",
    entity: "User",
    entityId: target.id,
    ip: getClientIp(req.headers)
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(IMPERSONATION_COOKIE, token, impersonationCookieOptions());
  return res;
}

export async function DELETE() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(IMPERSONATION_COOKIE, "", { ...impersonationCookieOptions(), maxAge: 0 });
  return res;
}

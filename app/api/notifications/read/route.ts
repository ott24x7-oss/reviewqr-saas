import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : undefined;

  if (id) {
    // Mark a single notification read — scoped to this user only.
    await prisma.notification.updateMany({
      where: { id, userId: user.id, isRead: false },
      data: { isRead: true }
    });
  } else {
    // Mark all unread notifications read for this user.
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true }
    });
  }

  return NextResponse.json({ ok: true });
}

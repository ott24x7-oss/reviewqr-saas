import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await prisma.location.findFirst({
    where: { id: params.locationId, businessId: params.id, business: { ownerId: user.id } }
  });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.location.update({ where: { id: ok.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

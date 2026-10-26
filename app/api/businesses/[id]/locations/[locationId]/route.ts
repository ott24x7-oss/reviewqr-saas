import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { denyFeatureResponse } from "@/lib/plans/feature-gate";
import { requireBusinessRole } from "@/lib/tenant";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const denied = await denyFeatureResponse(access.ownerId, "locations");
  if (denied) return denied;
  const ok = await prisma.location.findFirst({
    where: { id: params.locationId, businessId: params.id }
  });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.location.update({ where: { id: ok.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

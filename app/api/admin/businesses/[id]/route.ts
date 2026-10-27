import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const existing = await prisma.business.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    isActive?: boolean;
    reviewGating?: boolean;
    ratingThreshold?: number;
  };
  const data: { name?: string; isActive?: boolean; reviewGating?: boolean; ratingThreshold?: number } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Name must be 2–80 characters" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.reviewGating === "boolean") data.reviewGating = body.reviewGating;
  if (typeof body.ratingThreshold === "number" && body.ratingThreshold >= 4 && body.ratingThreshold <= 5) {
    data.ratingThreshold = Math.trunc(body.ratingThreshold);
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const business = await prisma.business.update({ where: { id: existing.id }, data });
  await logAudit({
    userId: guard.user.id,
    action: typeof data.isActive === "boolean" ? "business.suspend" : "business.update",
    entity: "Business",
    entityId: business.id,
    metadata: data,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ business });
}

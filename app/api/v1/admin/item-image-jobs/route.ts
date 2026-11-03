import { NextRequest, NextResponse } from "next/server";
import { requireAdminActor } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { approveItemImageJobs, rejectItemImageJobs } from "@/lib/admin/item-image-review";
import { v1Error } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const businessId = req.nextUrl.searchParams.get("businessId") || undefined;
  const jobs = await prisma.itemImageJob.findMany({
    where: { status: "READY", ...(businessId ? { businessId } : {}) },
    orderBy: { createdAt: "asc" }, take: 100,
    include: { business: { select: { id: true, name: true } }, item: { select: { id: true, name: true, photo: true } } }
  });
  return NextResponse.json({ data: { jobs } });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({})) as { action?: string; jobIds?: unknown[]; keepOldAsGallery?: boolean };
  const ids = Array.isArray(body.jobIds) ? [...new Set(body.jobIds.filter((id): id is string => typeof id === "string"))] : [];
  if (!ids.length || ids.length > 50) return v1Error(400, "VALIDATION", "Choose between 1 and 50 ready photos");
  if (body.action === "approve") {
    const result = await approveItemImageJobs(auth.actor.user.id, ids, !!body.keepOldAsGallery);
    if (!result.approved) return v1Error(400, "VALIDATION", "No ready images were selected");
    return NextResponse.json({ data: result });
  }
  if (body.action === "reject") {
    const result = await rejectItemImageJobs(auth.actor.user.id, ids);
    return NextResponse.json({ data: result });
  }
  return v1Error(400, "VALIDATION", "Action must be approve or reject");
}

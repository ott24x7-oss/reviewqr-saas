import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { approveItemImageJobs } from "@/lib/admin/item-image-review";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = await req.json().catch(() => ({})) as { jobIds?: unknown[]; keepOldAsGallery?: boolean };
  const ids = Array.isArray(body.jobIds) ? [...new Set(body.jobIds.filter((id): id is string => typeof id === "string"))] : [];
  if (!ids.length || ids.length > 500) return NextResponse.json({ error: "Select between 1 and 500 ready photos" }, { status: 400 });
  const result = await approveItemImageJobs(guard.user.id, ids, !!body.keepOldAsGallery);
  if (!result.approved) return NextResponse.json({ error: "No ready images were selected" }, { status: 400 });
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { patchFeedback } from "@/lib/feedback/api";
import { getClientIp } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await patchFeedback(user.id, params.id, raw, getClientIp(req.headers)));
}

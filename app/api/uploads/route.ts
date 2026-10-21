import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { receiveUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  return legacyJson(await receiveUpload(user.id, form?.get("file"), form?.get("variant")));
}

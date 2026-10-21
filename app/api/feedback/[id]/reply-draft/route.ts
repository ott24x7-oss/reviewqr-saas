import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { draftFeedbackReply } from "@/lib/feedback/api";

/** Suggests a public reply and a private WhatsApp reply. Nothing is posted. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return legacyJson(await draftFeedbackReply(user.id, params.id));
}

import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/inbox";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : undefined;
  return legacyJson(await markNotificationsRead(user.id, id));
}

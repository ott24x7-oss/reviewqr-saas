import { NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/inbox";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return legacyJson(await listNotifications(user.id));
}

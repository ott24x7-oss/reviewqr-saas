import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { saveStoreSettings } from "@/lib/store/store-settings";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await saveStoreSettings(user.id, params.id, raw));
}

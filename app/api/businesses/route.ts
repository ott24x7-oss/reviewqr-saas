import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { createBusiness, listOwnedBusinesses } from "@/lib/business/api";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return legacyJson(await listOwnedBusinesses(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await createBusiness(user, raw));
}

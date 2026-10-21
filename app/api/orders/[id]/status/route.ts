import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { setOrderStatus } from "@/lib/store/order-command";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await setOrderStatus(user.id, params.id, raw));
}

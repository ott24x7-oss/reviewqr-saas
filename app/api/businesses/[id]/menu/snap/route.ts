import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { snapMenuPhoto } from "@/lib/store/menu-snap";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  const result = await snapMenuPhoto(user.id, params.id, raw);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ item: result.data.item });
}

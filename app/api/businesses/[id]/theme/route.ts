import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveBusinessTheme } from "@/lib/tap/theme-action";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await saveBusinessTheme(user.id, params.id, await req.json().catch(() => ({})));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

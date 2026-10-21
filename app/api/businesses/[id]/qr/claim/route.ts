import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { claimQrCode } from "@/lib/tap/qr-api";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  const result = await claimQrCode(user.id, params.id, raw, {
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });
  return NextResponse.json(result.data);
}

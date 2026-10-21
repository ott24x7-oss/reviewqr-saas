import { NextRequest, NextResponse } from "next/server";
import { legacyJson } from "@/lib/api/legacy";
import { requireUser } from "@/lib/auth";
import { createQrCode, listQrCodes, patchQrCodes } from "@/lib/tap/qr-api";
import { getClientIp } from "@/lib/utils";

function meta(req: NextRequest) {
  return { ip: getClientIp(req.headers), userAgent: req.headers.get("user-agent") || undefined };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return legacyJson(await listQrCodes(user.id, params.id));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await createQrCode(user.id, params.id, raw, meta(req)));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  return legacyJson(await patchQrCodes(user.id, params.id, raw, meta(req)));
}

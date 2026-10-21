import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { createQrCode, listQrPage, patchQrCodes } from "@/lib/tap/qr-api";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

function meta(req: NextRequest) {
  return { ip: getClientIp(req.headers), userAgent: req.headers.get("user-agent") || undefined };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(await listQrPage(auth.user.id, params.id, page.page));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await createQrCode(auth.user.id, params.id, raw, meta(req)));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await patchQrCodes(auth.user.id, params.id, raw, meta(req)));
}

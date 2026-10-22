import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { readTapPage, saveTapPage } from "@/lib/tap/page-save";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await readTapPage(auth.user.id, params.id));
}

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await saveTapPage(auth.user.id, params.id, raw));
}

export const GET = observe(getHandler);
export const PATCH = observe(patchHandler);

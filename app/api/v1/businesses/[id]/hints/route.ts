import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { hintCreateSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { addHint, listHints, removeHint } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await listHints(auth.user.id, params.id));
}

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, hintCreateSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await addHint(auth.user.id, params.id, parsed.data.content));
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const hintId = req.nextUrl.searchParams.get("hintId") || "";
  return v1From(await removeHint(auth.user.id, params.id, hintId));
}
export const GET = observe(getHandler);
export const POST = observe(postHandler);
export const DELETE = observe(deleteHandler);

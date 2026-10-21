import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { archiveBusiness, getBusiness, updateBusiness } from "@/lib/business/api";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await getBusiness(auth.user.id, params.id));
}

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await updateBusiness(auth.user.id, params.id, raw));
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await archiveBusiness(auth.user.id, params.id));
}
export const GET = observe(getHandler);
export const PATCH = observe(patchHandler);
export const DELETE = observe(deleteHandler);

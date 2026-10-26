import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { locationCreateSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { addLocation, listLocations } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await listLocations(auth.user.id, params.id));
}

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, locationCreateSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await addLocation(auth.user.id, params.id, parsed.data.name, parsed.data.city || ""));
}
export const GET = observe(getHandler);
export const POST = observe(postHandler);

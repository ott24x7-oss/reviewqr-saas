import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { staffRenameSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { removeStaff, updateStaff } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function patchHandler(req: NextRequest, { params }: { params: { id: string; staffId: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, staffRenameSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await updateStaff(auth.user.id, params.id, params.staffId, parsed.data.name));
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string; staffId: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await removeStaff(auth.user.id, params.id, params.staffId));
}
export const PATCH = observe(patchHandler);
export const DELETE = observe(deleteHandler);

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { aiSettingsSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { readAiSettings, saveAiSettings } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await readAiSettings(auth.user.id, params.id));
}

async function putHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, aiSettingsSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await saveAiSettings(auth.user.id, params.id, parsed.data.enabled, parsed.data.services));
}
export const GET = observe(getHandler);
export const PUT = observe(putHandler);

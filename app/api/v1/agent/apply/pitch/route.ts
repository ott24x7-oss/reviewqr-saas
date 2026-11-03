import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { loadResellerPitch } from "@/lib/plans/agent-applications";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1Data(await loadResellerPitch());
}

export const GET = observe(getHandler);

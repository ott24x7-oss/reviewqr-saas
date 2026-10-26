import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { staffStats } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string; staffId: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await staffStats(auth.user.id, params.id, params.staffId));
}
export const GET = observe(getHandler);

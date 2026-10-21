import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { patchFeedback } from "@/lib/feedback/api";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await patchFeedback(auth.user.id, params.id, raw, getClientIp(req.headers)));
}

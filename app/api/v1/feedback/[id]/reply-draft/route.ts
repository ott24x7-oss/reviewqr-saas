import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { draftFeedbackReply } from "@/lib/feedback/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await draftFeedbackReply(auth.user.id, params.id));
}

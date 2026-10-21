import { NextRequest } from "next/server";
import { notificationReadSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { markNotificationsRead } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, notificationReadSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await markNotificationsRead(auth.user.id, parsed.data.id));
}

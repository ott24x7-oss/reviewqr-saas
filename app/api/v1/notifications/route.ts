import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { listNotificationPage } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(await listNotificationPage(auth.user.id, page.page));
}

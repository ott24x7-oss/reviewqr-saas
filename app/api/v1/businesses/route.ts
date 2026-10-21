import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { createBusiness, listBusinessPage } from "@/lib/business/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(await listBusinessPage(auth.user.id, page.page));
}

export async function POST(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await createBusiness(auth.user, raw));
}

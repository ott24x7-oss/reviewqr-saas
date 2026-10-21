import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { loadOrderCardPage } from "@/lib/store/order-feed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  const businessId = req.nextUrl.searchParams.get("businessId");
  return v1From(await loadOrderCardPage(auth.user.id, { ...page.page, businessId }));
}

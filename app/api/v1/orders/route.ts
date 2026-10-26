import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Error, v1From, v1Page } from "@/lib/api/v1";
import { loadOrderCardPage, ownedStoreBlock } from "@/lib/store/order-feed";
import { orderListSince } from "@/lib/store/order-window";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  const locked = await ownedStoreBlock(auth.user.id);
  if (locked) return v1From(locked);
  const since = orderListSince(req.nextUrl.searchParams.get("from"));
  if (!since.ok) return v1Error(400, "VALIDATION", since.error);
  const businessId = req.nextUrl.searchParams.get("businessId");
  return v1From(await loadOrderCardPage(auth.user.id, { ...page.page, businessId, since: since.since }));
}
export const GET = observe(getHandler);

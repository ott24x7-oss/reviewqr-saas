import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { listBookings } from "@/lib/store/bookings";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  const query = req.nextUrl.searchParams;
  return v1From(
    await listBookings(auth.user.id, page.page, {
      businessId: query.get("businessId"),
      status: query.get("status"),
      date: query.get("date"),
      today: query.get("today") === "1" || query.get("today") === "true"
    })
  );
}

export const GET = observe(getHandler);

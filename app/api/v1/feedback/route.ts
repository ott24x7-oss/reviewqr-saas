import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { listFeedback } from "@/lib/feedback/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(
    await listFeedback(auth.user.id, page.page, {
      status: req.nextUrl.searchParams.get("status"),
      businessId: req.nextUrl.searchParams.get("businessId")
    })
  );
}

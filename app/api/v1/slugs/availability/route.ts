import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { checkSlug } from "@/lib/onboarding/slug";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1Data(await checkSlug(req.nextUrl.searchParams.get("slug") || ""));
}

export const GET = observe(getHandler);

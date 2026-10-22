import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { placeDetails, placesEnabled } from "@/lib/places";
import { rateLimitDb } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (!placesEnabled()) return v1Data({ enabled: false, place: null });

  const limit = await rateLimitDb({ key: `places:${auth.user.id}`, limit: 20, windowSeconds: 60 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many searches");

  const place = await placeDetails(req.nextUrl.searchParams.get("placeId") || "");
  if (!place) return v1Error(404, "NOT_FOUND", "Place not found");
  return v1Data({ enabled: true, place });
}

export const GET = observe(getHandler);

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimitDb } from "@/lib/rate-limit";
import { placeDetails, placesEnabled } from "@/lib/places";

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!placesEnabled()) return NextResponse.json({ enabled: false, place: null });

  const rl = await rateLimitDb({ key: `places:${user.id}`, limit: 20, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many searches" }, { status: 429 });

  const place = await placeDetails(req.nextUrl.searchParams.get("placeId") || "");
  if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });
  return NextResponse.json({ enabled: true, place });
}

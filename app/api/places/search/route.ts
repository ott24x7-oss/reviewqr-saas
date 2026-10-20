import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimitDb } from "@/lib/rate-limit";
import { placesEnabled, searchPlaces } from "@/lib/places";

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!placesEnabled()) return NextResponse.json({ enabled: false, predictions: [] });

  const rl = await rateLimitDb({ key: `places:${user.id}`, limit: 20, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many searches" }, { status: 429 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const predictions = await searchPlaces(q);
  return NextResponse.json({ enabled: true, predictions });
}

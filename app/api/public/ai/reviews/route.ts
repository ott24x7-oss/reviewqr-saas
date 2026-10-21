import { NextResponse } from "next/server";

/** Ready-to-post AI reviews have been removed. Use /api/public/ai/polish. */
export async function POST() {
  return NextResponse.json({ reviews: [] }, { status: 410 });
}

import { NextResponse } from "next/server";

/** The three-question review writer has been removed. */
export async function POST() {
  return NextResponse.json({ available: false }, { status: 410 });
}

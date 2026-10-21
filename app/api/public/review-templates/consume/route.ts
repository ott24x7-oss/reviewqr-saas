import { NextResponse } from "next/server";

/** Topic hints are inserted into the customer's own words. They are not claimed or posted. */
export async function POST() {
  return NextResponse.json(
    { error: "Topic hints are added to the customer's own text." },
    { status: 410 }
  );
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "YouPI checkout is no longer available. Choose Own UPI gateway or Razorpay." },
    { status: 410 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { phoneKey, requestLoginOtp } from "@/lib/otp";

const schema = z.object({ phone: z.string().min(10).max(20) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `otp-req:${ip}`, limit: 8, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const perPhone = await rateLimitDb({ key: `otp-phone:${key}`, limit: 5, windowSeconds: 600 });
    if (!perPhone.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const result = await requestLoginOtp(parsed.data.phone);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

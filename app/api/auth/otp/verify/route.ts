import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { phoneKey, verifyLoginOtp } from "@/lib/otp";

const schema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const key = phoneKey(parsed.data.phone) || ip;
  const rl = await rateLimitDb({ key: `otp-verify:${key}`, limit: 8, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const result = await verifyLoginOtp(parsed.data.phone, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, otpToken: result.otpToken });
}

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { confirmVerificationToken, sendVerificationEmail } from "@/lib/verify-email";
import { rateLimitDb } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const result = await confirmVerificationToken(token);
  const next = result.ok ? "/login?verified=1" : "/login?verify=failed";
  return NextResponse.redirect(absoluteUrl(next));
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.emailVerified || user.deletedAt) return NextResponse.json({ ok: true });

  const rl = await rateLimitDb({ key: `verify:${user.id}`, limit: 3, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  await sendVerificationEmail(user).catch(() => {});
  return NextResponse.json({ ok: true });
}

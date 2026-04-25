import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { absoluteUrl, getClientIp } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `forgot:${ip}`, limit: 5, windowSeconds: 600 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  // Don't reveal whether the email exists
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires }
  });

  const url = absoluteUrl(`/reset-password?token=${token}`);
  sendEmail({
    to: email,
    subject: "Reset your ReviewQR password",
    html: passwordResetEmail({ resetUrl: url, email })
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

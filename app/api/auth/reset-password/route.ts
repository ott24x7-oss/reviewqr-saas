import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validations";
import { rateLimitDb } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  token: z.string().min(20),
  password: passwordSchema
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `reset:${ip}`, limit: 8, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const token = hashToken(parsed.data.token);
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.identifier.startsWith("verify-email:") || row.expires.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  const password = await hashPassword(parsed.data.password);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.verificationToken.delete({ where: { token } });
      await tx.user.update({
        where: { email: row.identifier },
        data: { password }
      });
    });
  } catch {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

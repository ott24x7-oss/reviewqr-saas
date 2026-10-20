import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { phoneKey, requestPurposeOtp, verifyPurposeOtp } from "@/lib/otp";

const schema = z.object({
  action: z.enum(["request", "verify"]),
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid WhatsApp number" }, { status: 400 });
  const key = phoneKey(parsed.data.phone);
  if (!key) return NextResponse.json({ error: "Enter a valid WhatsApp number" }, { status: 400 });
  const identifier = `wa:${business.id}:${key}`;

  if (parsed.data.action === "request") {
    const sent = await requestPurposeOtp({
      identifier,
      phone: parsed.data.phone,
      purpose: "verify-whatsapp",
      email: user.email
    });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
    return NextResponse.json({ ok: true });
  }

  if (!parsed.data.code) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  const checked = await verifyPurposeOtp(identifier, "verify-whatsapp", parsed.data.code);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  await prisma.business.update({
    where: { id: business.id },
    data: { whatsappNumber: key, whatsappVerifiedAt: new Date() }
  });
  return NextResponse.json({ ok: true });
}

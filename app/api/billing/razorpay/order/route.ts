import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createRazorpayOrder, isRazorpayConfigured, planPriceForPeriod, PLANS } from "@/lib/payments";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  tier: z.enum(["STARTER", "GROWTH", "AGENCY"]),
  period: z.enum(["monthly", "yearly"])
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const amount = planPriceForPeriod(parsed.data.tier, parsed.data.period);
  if (!amount) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const order = await createRazorpayOrder({
    amount,
    receipt: `usr-${user.id.slice(0, 8)}-${Date.now()}`,
    notes: { userId: user.id, tier: parsed.data.tier, period: parsed.data.period }
  });

  await prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      currency: "INR",
      status: "PENDING",
      provider: "RAZORPAY",
      providerOrderId: order.id,
      tier: parsed.data.tier,
      periodMonths: parsed.data.period === "yearly" ? 12 : 1
    }
  });

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: "INR",
    plan: PLANS[parsed.data.tier].name,
    keyId: process.env.RAZORPAY_KEY_ID
  });
}

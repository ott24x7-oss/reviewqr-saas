import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  planPriceForPeriod,
  getPlan
} from "@/lib/payments";
import { getPaymentsConfig } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  tier: z.enum(["STARTER", "GROWTH", "AGENCY"]),
  period: z.enum(["monthly", "yearly"])
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isRazorpayConfigured())) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const amount = await planPriceForPeriod(parsed.data.tier, parsed.data.period);
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

  const plan = await getPlan(parsed.data.tier);
  const cfg = await getPaymentsConfig();

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: "INR",
    plan: plan.name,
    keyId: cfg.razorpayKeyId
  });
}

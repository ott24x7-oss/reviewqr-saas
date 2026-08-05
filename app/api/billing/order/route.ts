import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPaymentsConfig } from "@/lib/settings";
import { createOrder, type PayMethod } from "@/lib/manual-payments";

/** Create a pending UPI/USDT order and return the pay-to details. */
export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;
  const tier = String(body.tier || "").toUpperCase();
  const months = Number(body.months) === 12 ? 12 : 1;
  const method = (body.method === "usdt" ? "usdt" : "upi") as PayMethod;
  if (!["STARTER", "GROWTH", "AGENCY"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const cfg = await getPaymentsConfig();
  if (method === "upi" && (!cfg.upiEnabled || !cfg.upiId)) {
    return NextResponse.json({ error: "UPI payments are not available right now." }, { status: 400 });
  }
  if (method === "usdt" && (!cfg.usdtEnabled || !cfg.usdtAddress)) {
    return NextResponse.json({ error: "USDT payments are not available right now." }, { status: 400 });
  }

  try {
    const order = await createOrder(user.id, tier as any, months, method);
    const rupees = (order.amount / 100).toFixed(2);
    const upiLink =
      method === "upi"
        ? `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(
            cfg.upiPayeeName || "ReviewQR"
          )}&am=${rupees}&cu=INR&tn=${encodeURIComponent("ReviewQR " + tier)}`
        : null;

    return NextResponse.json({
      id: order.id,
      method,
      tier,
      months,
      amountInr: order.amount, // paise
      amountInrDisplay: rupees,
      amountUsdt: order.amountUsdt,
      expiresAt: order.expiresAt,
      upi: method === "upi" ? { id: cfg.upiId, payee: cfg.upiPayeeName, qr: cfg.upiQrDataUrl, link: upiLink } : null,
      usdt: method === "usdt" ? { address: cfg.usdtAddress, network: cfg.usdtNetwork } : null
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not create order" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { STORE_COUPON_LIMIT, storeCouponRateKeys } from "@/lib/store/limits";
import { couponDiscount, normalizeCouponCode, type CouponFail } from "@/lib/store/coupons";
import { featureBlock, planDeniedResponse } from "@/lib/plans/feature-gate";

const schema = z.object({
  code: z.string().min(4).max(32),
  coupon: z.string().min(1).max(24),
  subtotalPaise: z.number().int().min(0).max(10_000_000),
  lang: z.enum(["en", "hi"]).optional()
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid coupon" }, { status: 400 });
  }
  const data = parsed.data;
  const ipLimit = await rateLimitDb({ key: storeCouponRateKeys(ip, "pending")[0], ...STORE_COUPON_LIMIT });
  if (!ipLimit.ok) return NextResponse.json({ error: limited(data.lang) }, { status: 429 });

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: data.code },
    select: { status: true, business: { select: { id: true, isActive: true, archived: true, ownerId: true } } }
  });
  if (!qr?.business || qr.status !== "ACTIVE" || !qr.business.isActive || qr.business.archived) {
    return NextResponse.json({ error: "This menu is not available" }, { status: 404 });
  }
  const locked = await featureBlock(qr.business.ownerId, "offers");
  if (locked) return planDeniedResponse(locked);

  const storeLimit = await rateLimitDb({
    key: storeCouponRateKeys(ip, qr.business.id)[1],
    ...STORE_COUPON_LIMIT
  });
  if (!storeLimit.ok) return NextResponse.json({ error: limited(data.lang) }, { status: 429 });

  const couponCode = normalizeCouponCode(data.coupon);
  const coupon = couponCode
    ? await prisma.coupon.findUnique({ where: { businessId_code: { businessId: qr.business.id, code: couponCode } } })
    : null;
  const decision = coupon ? couponDiscount(coupon, data.subtotalPaise) : { ok: false as const, code: "invalid" as const };
  if (!decision.ok || !coupon) {
    return NextResponse.json({ error: explain(data.lang, decision.ok ? "invalid" : decision.code) }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    discountPaise: decision.discountPaise,
    coupon: {
      code: coupon.code,
      kind: coupon.kind,
      amount: coupon.amount,
      minSubtotalPaise: coupon.minSubtotalPaise,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      active: coupon.active
    }
  });
}

function limited(lang?: "en" | "hi") {
  return lang === "hi"
    ? "बहुत सारी कूपन जाँच। 10 मिनट बाद कोशिश करें।"
    : "Too many coupon checks. Wait 10 minutes and try again.";
}

function explain(lang: "en" | "hi" | undefined, code: CouponFail) {
  const hi = lang === "hi";
  if (code === "expired") return hi ? "इस कूपन की समय-सीमा समाप्त हो गई है।" : "That coupon has expired.";
  if (code === "minimum") return hi ? "इस कूपन के लिए ऑर्डर और बढ़ाएँ।" : "This coupon needs a higher order.";
  if (code === "used") return hi ? "यह कूपन इस्तेमाल हो चुका है।" : "That coupon has been used up.";
  return hi ? "यह कूपन कोड मान्य नहीं है।" : "That coupon code is not valid.";
}

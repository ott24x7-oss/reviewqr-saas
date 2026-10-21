import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownerLimitError, calendarMonthStart } from "@/lib/entitlements";
import { rateLimitDb } from "@/lib/rate-limit";
import { absoluteUrl, getClientIp } from "@/lib/utils";
import { makeQrPublicId } from "@/lib/tap/ids";
import { hoursFromPublished, whatsAppNumberUrl } from "@/lib/tap/links";
import { fitWhatsAppOrder, formatRupees } from "@/lib/tap/order-message";
import { STORE_ORDER_LIMIT, storeOrderRateKeys } from "@/lib/store/limits";
import { enabledOrderTypes, quoteOrder, rulesFromSettings, type OrderType } from "@/lib/store/pricing";
import { optionLineName, resolveChoice } from "@/lib/store/variants";
import { couponDiscount, normalizeCouponCode } from "@/lib/store/coupons";
import { normalizeUpiId, upiPayUrl } from "@/lib/store/upi";
import { appendStatusEvent, consentedPhone } from "@/lib/store/order-status";
import { notifyNewOrder } from "@/lib/store/order-alert";

const schema = z.object({
  code: z.string().min(4).max(32),
  lang: z.enum(["en", "hi"]).optional(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  customerName: z.string().max(80).optional(),
  tableOrAddress: z.string().max(160).optional(),
  pincode: z.string().max(12).optional(),
  note: z.string().max(400).optional(),
  coupon: z.string().max(24).optional(),
  payment: z.enum(["CASH", "UPI"]).optional(),
  customerPhone: z.string().max(20).optional(),
  consent: z.boolean().optional(),
  items: z.array(z.object({
    id: z.string().min(1).max(40),
    qty: z.number().int().min(1).max(20),
    note: z.string().max(80).optional(),
    variantId: z.string().max(40).optional(),
    addonIds: z.array(z.string().max(40)).max(12).optional()
  })).min(1).max(40)
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid order" }, { status: 400 });
  }
  const data = parsed.data;
  const ipLimit = await rateLimitDb({ key: storeOrderRateKeys(ip, "pending")[0], ...STORE_ORDER_LIMIT });
  if (!ipLimit.ok) {
    return NextResponse.json({ error: tooMany(data.lang) }, { status: 429 });
  }

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: data.code },
    include: {
      business: {
        include: {
          owner: {
            select: {
              id: true,
              subscriptionTier: true,
              subscriptionStatus: true,
              trialEndsAt: true,
              subscriptionEndsAt: true
            }
          }
        }
      }
    }
  });
  if (!qr?.business || qr.status !== "ACTIVE" || !qr.business.isActive || qr.business.archived) {
    return NextResponse.json({ error: "This menu is not available" }, { status: 404 });
  }

  const storeLimit = await rateLimitDb({
    key: storeOrderRateKeys(ip, qr.business.id)[1],
    ...STORE_ORDER_LIMIT
  });
  if (!storeLimit.ok) {
    return NextResponse.json({ error: tooMany(data.lang) }, { status: 429 });
  }

  const used = await prisma.menuOrder.count({
    where: { business: { ownerId: qr.business.ownerId }, createdAt: { gte: calendarMonthStart() } }
  });
  const limitError = await ownerLimitError(qr.business.owner, "storeOrders", used);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  const [rows, settings, tap] = await Promise.all([
    prisma.menuItem.findMany({
      where: { businessId: qr.business.id, available: true, id: { in: data.items.map((item) => item.id) } },
      include: { variants: true, addOns: true }
    }),
    prisma.storeSettings.findUnique({ where: { businessId: qr.business.id } }),
    prisma.tapPage.findUnique({ where: { businessId: qr.business.id }, select: { published: true } })
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (data.items.some((item) => !byId.has(item.id))) {
    return NextResponse.json({ error: data.lang === "hi" ? "कोई आइटम अब उपलब्ध नहीं है" : "An item is no longer available" }, { status: 400 });
  }
  const lines: {
    id: string;
    name: string;
    qty: number;
    unitPaise: number;
    note: string;
    variantId: string | null;
    addonIds: string[];
  }[] = [];
  for (const item of data.items) {
    const row = byId.get(item.id)!;
    const choice = resolveChoice({
      itemPricePaise: row.pricePaise,
      variants: row.variants,
      addOns: row.addOns,
      variantId: item.variantId,
      addonIds: item.addonIds
    });
    if (!choice.ok) {
      return NextResponse.json({ error: explain(data.lang, choice.code) }, { status: 400 });
    }
    const hindi = data.lang === "hi";
    const variantLabel = choice.variant
      ? hindi && choice.variant.labelHi
        ? choice.variant.labelHi
        : choice.variant.label
      : "";
    lines.push({
      id: row.id,
      name: optionLineName(
        hindi && row.nameHi ? row.nameHi : row.name,
        variantLabel,
        choice.addOns.map((addOn) => (hindi && addOn.nameHi ? addOn.nameHi : addOn.name))
      ),
      qty: item.qty,
      unitPaise: choice.unitPaise,
      note: (item.note || "").trim(),
      variantId: choice.variant?.id || null,
      addonIds: choice.addOns.map((addOn) => addOn.id)
    });
  }
  const subtotalPaise = lines.reduce((sum, line) => sum + line.unitPaise * line.qty, 0);
  const rules = rulesFromSettings(settings, hoursFromPublished(tap?.published));
  const orderType = (data.orderType && enabledOrderTypes(rules).includes(data.orderType)
    ? data.orderType
    : enabledOrderTypes(rules)[0]) as OrderType | undefined;
  if (!orderType) {
    return NextResponse.json({ error: explain(data.lang, "order_type") }, { status: 400 });
  }
  const couponCode = normalizeCouponCode(data.coupon || "");
  let discountPaise = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { businessId_code: { businessId: qr.business.id, code: couponCode } }
    });
    const decision = coupon ? couponDiscount(coupon, subtotalPaise) : { ok: false as const, code: "invalid" as const };
    if (!decision.ok) {
      return NextResponse.json({ error: explain(data.lang, decision.code) }, { status: 400 });
    }
    discountPaise = decision.discountPaise;
  }
  const quote = quoteOrder({
    rules,
    orderType,
    subtotalPaise,
    discountPaise,
    pincode: data.pincode
  });
  if (!quote.ok) {
    return NextResponse.json({ error: explain(data.lang, quote.code, quote.shortfallPaise) }, { status: 400 });
  }

  const customerName = (data.customerName || "").trim().slice(0, 80) || null;
  const tableOrAddress = (data.tableOrAddress || "").trim().slice(0, 160) || null;
  const note = (data.note || "").trim().slice(0, 400) || null;
  const pincode = orderType === "DELIVERY" ? (data.pincode || "").replace(/\D/g, "").slice(0, 6) : null;
  const businessId = qr.business.id;
  const upiId = normalizeUpiId(settings?.upiId || "") || "";
  const payment = data.payment === "UPI" ? "UPI" : "CASH";
  if (payment === "UPI" && !upiId) {
    return NextResponse.json({ error: explain(data.lang, "payment") }, { status: 400 });
  }
  const savedPhone = consentedPhone(data.customerPhone, data.consent);
  const events = appendStatusEvent([], "NEW");

  let order = null;
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    try {
      order = await prisma.$transaction(async (tx) => {
        if (couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { businessId_code: { businessId, code: couponCode } }
          });
          const decision = coupon ? couponDiscount(coupon, subtotalPaise) : { ok: false as const, code: "invalid" as const };
          if (!coupon || !decision.ok) throw couponReject(decision.ok ? "invalid" : decision.code);
          const saved = await tx.coupon.updateMany({
            where: {
              id: coupon.id,
              active: true,
              ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {})
            },
            data: { usedCount: { increment: 1 } }
          });
          if (saved.count !== 1) throw couponReject("used");
        }
        return tx.menuOrder.create({
          data: {
            businessId,
            qrCodeId: qr.id,
            number: `M${makeQrPublicId()}`,
            customerName,
            customerPhone: savedPhone.customerPhone,
            consentAt: savedPhone.consentAt,
            lang: data.lang === "hi" ? "hi" : "en",
            tableOrAddress,
            note,
            orderType,
            pincode,
            subtotalPaise: quote.subtotalPaise,
            discountPaise: quote.discountPaise,
            deliveryPaise: quote.deliveryPaise,
            packingPaise: quote.packingPaise,
            gstPaise: quote.gstPaise,
            pricesIncludeGst: quote.pricesIncludeGst,
            orderForLater: quote.orderForLater,
            prepMinutes: quote.prepMinutes,
            couponCode: couponCode || null,
            payment,
            totalPaise: quote.totalPaise,
            items: lines,
            source: "qr",
            status: "NEW",
            events
          }
        });
      });
    } catch (err) {
      if (err instanceof Error && err.name === "CouponReject") {
        return NextResponse.json({ error: explain(data.lang, err.message) }, { status: 400 });
      }
      if (attempt === 2 || !isUnique(err)) throw err;
    }
  }
  if (!order) return NextResponse.json({ error: "Could not save the order" }, { status: 500 });

  if (savedPhone.customerPhone && savedPhone.consentAt) {
    try {
      await prisma.contact.upsert({
        where: { businessId_phone: { businessId, phone: savedPhone.customerPhone } },
        create: {
          businessId,
          phone: savedPhone.customerPhone,
          name: customerName,
          source: "order"
        },
        update: customerName ? { name: customerName } : {}
      });
    } catch (err) {
      console.error("[orders] contact failed", err);
    }
  }

  try {
    await notifyNewOrder({
      businessId,
      ownerId: qr.business.ownerId,
      number: order.number,
      businessName: qr.business.name,
      totalPaise: quote.totalPaise,
      orderId: order.id
    });
  } catch (err) {
    console.error("[orders] notify failed", err);
  }

  const wa = whatsAppNumberUrl(qr.business.whatsappNumber);
  const digits = wa ? wa.replace("https://wa.me/", "") : "";
  const url = digits
    ? fitWhatsAppOrder(digits, {
        businessName: qr.business.name,
        lines,
        customerName: customerName || "",
        tableOrAddress: tableOrAddress || "",
        note: note || "",
        hindi: data.lang === "hi",
        charges: {
          subtotalPaise: quote.subtotalPaise,
          deliveryPaise: quote.deliveryPaise,
          packingPaise: quote.packingPaise,
          discountPaise: quote.discountPaise,
          gstPaise: quote.gstPaise,
          pricesIncludeGst: quote.pricesIncludeGst,
          totalPaise: quote.totalPaise,
          orderForLater: quote.orderForLater,
          prepMinutes: quote.prepMinutes,
          orderType,
          pincode: pincode || "",
          ...(payment === "UPI" ? { paymentUrl: upiPayUrl(upiId, qr.business.name, quote.totalPaise) } : {}),
          trackUrl: absoluteUrl(`/o/${order.id}`)
        }
      }).url
    : null;
  return NextResponse.json({
    ok: true,
    number: order.number,
    url,
    totalPaise: quote.totalPaise,
    track: `/o/${order.id}`
  });
}

function tooMany(lang?: "en" | "hi") {
  return lang === "hi"
    ? "बहुत सारे ऑर्डर। 10 मिनट बाद कोशिश करें।"
    : "Too many orders. Wait 10 minutes and try again.";
}

function explain(lang: "en" | "hi" | undefined, code: string, shortfallPaise?: number) {
  const hi = lang === "hi";
  if (code === "min_order") {
    const more = formatRupees(shortfallPaise || 0);
    return hi ? `न्यूनतम ऑर्डर के लिए ${more} और जोड़ें।` : `Add ${more} more to reach the minimum order.`;
  }
  if (code === "pincode") return hi ? "हम इस पिनकोड पर डिलीवरी नहीं करते।" : "We don't deliver to that pincode.";
  if (code === "order_type") return hi ? "यह ऑर्डर प्रकार उपलब्ध नहीं है।" : "That order type isn't available.";
  if (code === "choose") return hi ? "साइज़ या विकल्प चुनें।" : "Choose a size or option.";
  if (code === "stock") return hi ? "वह विकल्प स्टॉक में नहीं है।" : "That option is out of stock.";
  if (code === "missing") return hi ? "कोई विकल्प अब उपलब्ध नहीं है।" : "An option is no longer available.";
  if (code === "invalid") return hi ? "यह कूपन कोड मान्य नहीं है।" : "That coupon code is not valid.";
  if (code === "expired") return hi ? "इस कूपन की समय-सीमा समाप्त हो गई है।" : "That coupon has expired.";
  if (code === "minimum") return hi ? "इस कूपन के लिए ऑर्डर और बढ़ाएँ।" : "This coupon needs a higher order.";
  if (code === "used") return hi ? "यह कूपन इस्तेमाल हो चुका है।" : "That coupon has been used up.";
  if (code === "payment") return hi ? "UPI अभी उपलब्ध नहीं है।" : "UPI isn't available right now.";
  return hi ? "ऑर्डर नहीं बन सका।" : "Could not place the order";
}

function couponReject(code: string) {
  const err = new Error(code);
  err.name = "CouponReject";
  return err;
}

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownerLimitError, calendarMonthStart } from "@/lib/entitlements";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { makeQrPublicId } from "@/lib/tap/ids";
import { hoursFromPublished, whatsAppNumberUrl } from "@/lib/tap/links";
import { fitWhatsAppOrder, formatRupees } from "@/lib/tap/order-message";
import { STORE_ORDER_LIMIT, storeOrderRateKeys } from "@/lib/store/limits";
import { enabledOrderTypes, quoteOrder, rulesFromSettings, type OrderType } from "@/lib/store/pricing";

const schema = z.object({
  code: z.string().min(4).max(32),
  lang: z.enum(["en", "hi"]).optional(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  customerName: z.string().max(80).optional(),
  tableOrAddress: z.string().max(160).optional(),
  pincode: z.string().max(12).optional(),
  note: z.string().max(400).optional(),
  items: z.array(z.object({
    id: z.string().min(1).max(40),
    qty: z.number().int().min(1).max(20),
    note: z.string().max(80).optional()
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
      where: { businessId: qr.business.id, available: true, id: { in: data.items.map((item) => item.id) } }
    }),
    prisma.storeSettings.findUnique({ where: { businessId: qr.business.id } }),
    prisma.tapPage.findUnique({ where: { businessId: qr.business.id }, select: { published: true } })
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (data.items.some((item) => !byId.has(item.id))) {
    return NextResponse.json({ error: data.lang === "hi" ? "कोई आइटम अब उपलब्ध नहीं है" : "An item is no longer available" }, { status: 400 });
  }
  const lines = data.items.map((item) => {
    const row = byId.get(item.id)!;
    const hindi = data.lang === "hi" && row.nameHi;
    return {
      id: row.id,
      name: hindi ? row.nameHi! : row.name,
      qty: item.qty,
      unitPaise: row.pricePaise,
      note: (item.note || "").trim()
    };
  });
  const subtotalPaise = lines.reduce((sum, line) => sum + line.unitPaise * line.qty, 0);
  const rules = rulesFromSettings(settings, hoursFromPublished(tap?.published));
  const orderType = (data.orderType && enabledOrderTypes(rules).includes(data.orderType)
    ? data.orderType
    : enabledOrderTypes(rules)[0]) as OrderType | undefined;
  if (!orderType) {
    return NextResponse.json({ error: explain(data.lang, "order_type") }, { status: 400 });
  }
  const quote = quoteOrder({
    rules,
    orderType,
    subtotalPaise,
    pincode: data.pincode
  });
  if (!quote.ok) {
    return NextResponse.json({ error: explain(data.lang, quote.code, quote.shortfallPaise) }, { status: 400 });
  }

  const customerName = (data.customerName || "").trim().slice(0, 80) || null;
  const tableOrAddress = (data.tableOrAddress || "").trim().slice(0, 160) || null;
  const note = (data.note || "").trim().slice(0, 400) || null;
  const pincode = orderType === "DELIVERY" ? (data.pincode || "").replace(/\D/g, "").slice(0, 6) : null;

  let order = null;
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    try {
      order = await prisma.menuOrder.create({
        data: {
          businessId: qr.business.id,
          qrCodeId: qr.id,
          number: `M${makeQrPublicId()}`,
          customerName,
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
          totalPaise: quote.totalPaise,
          items: lines,
          source: "qr",
          status: "NEW"
        }
      });
    } catch (err) {
      if (attempt === 2 || !isUnique(err)) throw err;
    }
  }
  if (!order) return NextResponse.json({ error: "Could not save the order" }, { status: 500 });

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
          gstPaise: quote.gstPaise,
          pricesIncludeGst: quote.pricesIncludeGst,
          totalPaise: quote.totalPaise,
          orderForLater: quote.orderForLater,
          prepMinutes: quote.prepMinutes,
          orderType,
          pincode: pincode || ""
        }
      }).url
    : null;
  return NextResponse.json({ ok: true, number: order.number, url, totalPaise: quote.totalPaise });
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
  return hi ? "ऑर्डर नहीं बन सका।" : "Could not place the order";
}

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
}

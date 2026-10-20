import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownerLimitError, calendarMonthStart } from "@/lib/entitlements";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { makeQrPublicId } from "@/lib/tap/ids";
import { whatsAppNumberUrl } from "@/lib/tap/links";
import { fitWhatsAppOrder } from "@/lib/tap/order-message";

const schema = z.object({
  code: z.string().min(4).max(32),
  lang: z.enum(["en", "hi"]).optional(),
  customerName: z.string().max(80).optional(),
  tableOrAddress: z.string().max(160).optional(),
  note: z.string().max(400).optional(),
  items: z.array(z.object({
    id: z.string().min(1).max(40),
    qty: z.number().int().min(1).max(20),
    note: z.string().max(80).optional()
  })).min(1).max(40)
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimitDb({ key: `menu-order:${ip}`, limit: 20, windowSeconds: 60 });
  if (!limit.ok) return NextResponse.json({ error: "Too many orders. Try again in a minute." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid order" }, { status: 400 });
  }
  const data = parsed.data;
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

  const used = await prisma.menuOrder.count({
    where: { business: { ownerId: qr.business.ownerId }, createdAt: { gte: calendarMonthStart() } }
  });
  const limitError = await ownerLimitError(qr.business.owner, "storeOrders", used);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  const rows = await prisma.menuItem.findMany({
    where: { businessId: qr.business.id, available: true, id: { in: data.items.map((item) => item.id) } }
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (data.items.some((item) => !byId.has(item.id))) {
    return NextResponse.json({ error: "An item is no longer available" }, { status: 400 });
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
  const totalPaise = lines.reduce((sum, line) => sum + line.unitPaise * line.qty, 0);
  const customerName = (data.customerName || "").trim().slice(0, 80) || null;
  const tableOrAddress = (data.tableOrAddress || "").trim().slice(0, 160) || null;
  const note = (data.note || "").trim().slice(0, 400) || null;

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
          totalPaise,
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
        hindi: data.lang === "hi"
      }).url
    : null;
  return NextResponse.json({ ok: true, number: order.number, url });
}

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
}

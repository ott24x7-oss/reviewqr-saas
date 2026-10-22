/** Issue a GST credit note. A free reprint does not create one. */
import { fail, ok } from "@/lib/api/result";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { nextInvoiceNumber } from "@/lib/subscription";
import { scaleCredit } from "./commission";
import { reverseCommissionsForOrder } from "../plans/ledger";

export async function issueShopCreditNote(opts: {
  orderId: string;
  userId: string;
  reason: string;
  amountPaise?: number | null;
}) {
  const reason = opts.reason.trim();
  if (!reason) return fail(400, "Add a reason for the credit note");
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findUnique({ where: { id: opts.orderId } });
    if (!order) return { ok: false as const, error: "Order not found" };
    if (order.paymentStatus !== "PAID") return { ok: false as const, error: "Only a paid order can be credited" };
    const requested = opts.amountPaise == null ? order.totalPaise : opts.amountPaise;
    const scaled = scaleCredit({
      amountPaise: requested,
      totalPaise: order.totalPaise,
      taxablePaise: order.taxablePaise,
      cgstPaise: order.cgstPaise,
      sgstPaise: order.sgstPaise,
      igstPaise: order.igstPaise
    });
    if (scaled.amountPaise <= 0) return { ok: false as const, error: "Credit amount must be above zero" };
    const number = await nextInvoiceNumber(tx, new Date(), "CN");
    const note = await tx.shopCreditNote.create({
      data: {
        orderId: order.id,
        number,
        reason,
        amountPaise: scaled.amountPaise,
        taxablePaise: scaled.taxablePaise,
        cgstPaise: scaled.cgstPaise,
        sgstPaise: scaled.sgstPaise,
        igstPaise: scaled.igstPaise
      }
    });
    return { ok: true as const, note };
  });
  if (!result.ok) return fail(result.error === "Order not found" ? 404 : 400, result.error);
  const order = await prisma.shopOrder.findUnique({ where: { id: opts.orderId }, select: { totalPaise: true } });
  if (order && result.note.amountPaise >= order.totalPaise) {
    await reverseCommissionsForOrder(opts.orderId);
  }
  await logAudit({
    userId: opts.userId,
    action: "shop.credit",
    entity: "ShopOrder",
    entityId: opts.orderId,
    metadata: { number: result.note.number, amountPaise: result.note.amountPaise, reason }
  });
  return ok({
    id: result.note.id,
    number: result.note.number,
    amountPaise: result.note.amountPaise
  });
}

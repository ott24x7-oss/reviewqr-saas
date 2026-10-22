/**
 * Mark a shop order paid, issue the next GST invoice number, and grant a bundled plan.
 * A second call for the same order does not take another number or another month.
 */
import type { Prisma, SubscriptionTier } from "@prisma/client";
import { logAudit } from "../admin";
import { prisma } from "../db";
import { extendSubscriptionEnd, nextInvoiceNumber } from "../subscription";
import { legacyPlanId, limitsForTier, modulesForTier } from "../plans/legacy";
import { grantPlanAccess } from "../plans/snapshot";
import { bundleGrant } from "./bundle";
import { holdUntil } from "../plans/commission-rules";
import { getPlanProgramSettings } from "../plans/settings";

export type FulfillInput = {
  orderId: string;
  providerPaymentId?: string | null;
  utr?: string | null;
  verifiedVia: string;
  expectedAmountPaise?: number;
  nextInvoiceNumber?: (tx: Prisma.TransactionClient, now?: Date) => Promise<string>;
};

export type FulfillResult =
  | { ok: true; already: boolean; invoiceNumber: string | null }
  | { ok: false; error: string };

export async function fulfillPaidShopOrder(input: FulfillInput): Promise<FulfillResult> {
  const issue = input.nextInvoiceNumber ?? nextInvoiceNumber;
  const settings = await getPlanProgramSettings();
  const heldUntil = holdUntil(new Date(), settings.commissionHoldDays);
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        paymentStatus: string;
        advancePaise: number;
        invoiceNumber: string | null;
        userId: string;
        businessId: string | null;
        couponCode: string | null;
        providerPaymentId: string | null;
        agentId: string | null;
        commissionPercent: number | null;
        commissionPaise: number;
      }>
    >`
      SELECT "id", "status", "paymentStatus", "advancePaise", "invoiceNumber", "userId", "businessId", "couponCode", "providerPaymentId", "agentId", "commissionPercent", "commissionPaise"
      FROM "ShopOrder"
      WHERE "id" = ${input.orderId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Order not found" };
    if (row.paymentStatus === "PAID") {
      return { ok: true as const, already: true, invoiceNumber: row.invoiceNumber, userId: row.userId };
    }
    if (row.paymentStatus === "REFUNDED") return { ok: false as const, error: "Payment was refunded" };
    if (row.paymentStatus !== "PENDING" || row.status !== "PENDING_PAYMENT") {
      return { ok: false as const, error: "Payment cannot be completed" };
    }
    if (input.expectedAmountPaise != null && input.expectedAmountPaise !== row.advancePaise) {
      return { ok: false as const, error: "Amount mismatch" };
    }
    if (input.providerPaymentId) {
      const clash = await tx.shopOrder.findFirst({
        where: { providerPaymentId: input.providerPaymentId, NOT: { id: row.id } },
        select: { id: true }
      });
      if (clash) return { ok: false as const, error: "Payment reference already used" };
    }

    const lines = await tx.shopOrderLine.findMany({ where: { orderId: row.id } });
    for (const line of lines) {
      if (!line.variantId) return { ok: false as const, error: "This item is not for sale" };
      const locked = await tx.$queryRaw<Array<{ stock: number }>>`
        SELECT "stock" FROM "CatalogVariant" WHERE "id" = ${line.variantId} FOR UPDATE
      `;
      if (!locked[0] || locked[0].stock < line.qty) {
        return { ok: false as const, error: line.includedLifetime ? "Founder lifetime is sold out" : "Not enough stock" };
      }
    }

    let beneficiaryId = row.userId;
    if (row.businessId) {
      const business = await tx.business.findUnique({ where: { id: row.businessId }, select: { ownerId: true } });
      if (business) beneficiaryId = business.ownerId;
    }
    const users = await tx.$queryRaw<
      Array<{ id: string; subscriptionTier: SubscriptionTier; subscriptionEndsAt: Date | null }>
    >`
      SELECT "id", "subscriptionTier", "subscriptionEndsAt" FROM "User" WHERE "id" = ${beneficiaryId} FOR UPDATE
    `;
    const user = users[0];
    if (!user) return { ok: false as const, error: "User not found" };

    let tier = user.subscriptionTier;
    let endsAt = user.subscriptionEndsAt;
    let grant = false;
    const now = new Date();
    for (const line of lines) {
      const spec = bundleGrant(
        {
          includedTier: line.includedTier,
          includedMonths: line.includedMonths,
          includedLifetime: line.includedLifetime
        },
        endsAt,
        now
      );
      if (!spec.ok) return { ok: false as const, error: spec.error };
      if (spec.tier == null) continue;
      grant = true;
      if (spec.lifetime) {
        tier = "FOUNDER";
        endsAt = null;
        continue;
      }
      if (tier === "FOUNDER") continue;
      tier = spec.tier;
      endsAt = spec.endsAt;
      for (let count = 1; count < line.qty; count += 1) {
        endsAt = extendSubscriptionEnd(endsAt, spec.months, now);
      }
    }

    const invoiceNumber = row.invoiceNumber ?? (await issue(tx, now));
    await tx.shopOrder.update({
      where: { id: row.id },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        providerPaymentId: input.providerPaymentId || undefined,
        utr: input.utr || undefined,
        verifiedVia: input.verifiedVia,
        invoiceNumber,
        invoiceIssuedAt: now,
        paidAt: now
      }
    });
    for (const line of lines) {
      if (!line.variantId) continue;
      await tx.catalogVariant.update({
        where: { id: line.variantId },
        data: { stock: { decrement: line.qty } }
      });
    }
    if (row.couponCode) {
      await tx.shopCoupon.updateMany({
        where: { code: row.couponCode },
        data: { usedCount: { increment: 1 } }
      });
    }
    if (grant) {
      await grantPlanAccess(tx, {
        userId: user.id,
        tier,
        status: "ACTIVE",
        endsAt,
        startsAt: now,
        planId: legacyPlanId(tier),
        duration: tier === "FOUNDER" ? "LIFETIME" : null,
        modules: modulesForTier(tier),
        limits: limitsForTier(tier)
      });
    }
    await tx.shopCartLine.deleteMany({ where: { cart: { userId: row.userId } } });
    await tx.shopCart.updateMany({
      where: { userId: row.userId },
      data: { couponCode: null, referralCode: null }
    });
    // Find-then-create. A caught unique violation inside this transaction would abort it.
    if (row.agentId && row.agentId !== row.userId && row.agentId !== beneficiaryId && row.commissionPaise > 0) {
      const existing = await tx.shopCommission.findUnique({
        where: {
          agentId_kind_sourceId: { agentId: row.agentId, kind: "ORDER", sourceId: row.id }
        }
      });
      if (!existing) {
        await tx.shopCommission.create({
          data: {
            agentId: row.agentId,
            kind: "ORDER",
            sourceId: row.id,
            orderId: row.id,
            amountPaise: row.commissionPaise,
            percent: row.commissionPercent ?? 0,
            basis: (row.commissionPercent ?? 0) > 0 ? "PERCENT" : "FLAT",
            flatPaise: (row.commissionPercent ?? 0) > 0 ? 0 : row.commissionPaise,
            saleKind: "HARDWARE",
            status: "PENDING",
            holdUntil: heldUntil
          }
        });
      }
    }
    return { ok: true as const, already: false, invoiceNumber, userId: row.userId };
  });

  if (result.ok && !result.already) {
    await logAudit({
      userId: result.userId,
      action: "shop.order.pay",
      entity: "ShopOrder",
      entityId: input.orderId,
      metadata: { invoiceNumber: result.invoiceNumber, verifiedVia: input.verifiedVia }
    });
  }
  if (!result.ok) return result;
  return { ok: true, already: result.already, invoiceNumber: result.invoiceNumber };
}

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { activateCompletedPayment } from "./subscription";
import { canClaimCreditPair, matchCredit } from "./payments/credit-matcher";
import { fulfillPaidShopOrder } from "./shop/fulfill";

export type NewBankCredit = {
  source: "sms" | "gmail" | "imap";
  amountPaise: number;
  utr: string | null;
  sender: string;
  payerName?: string | null;
  receivedAt: Date;
  rawHash: string;
  signature?: string | null;
  bodyExcerpt: string;
  deviceId?: string | null;
};

export function bankMessageHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function matchBankCredit(creditId: string): Promise<{ matched: boolean; reviewNote: string | null }> {
  const credit = await prisma.bankCredit.findUnique({ where: { id: creditId } });
  if (!credit) return { matched: false, reviewNote: null };
  if (credit.paymentId) {
    const payment = await prisma.payment.findUnique({ where: { id: credit.paymentId }, select: { status: true } });
    if (payment?.status === "PENDING") {
      try {
        const result = await activateCompletedPayment({ paymentId: credit.paymentId, expectedAmountPaise: credit.amountPaise, utr: credit.utr, verifiedVia: credit.source, matchedEmail: `bank-credit:${credit.id}` });
        if (result.ok) {
          await prisma.bankCredit.updateMany({ where: { id: credit.id, paymentId: credit.paymentId }, data: { reviewNote: null } });
          return { matched: true, reviewNote: null };
        }
      } catch { /* keep the claim so the next reconciliation can retry */ }
      const note = "Credit is claimed; payment activation will retry.";
      await prisma.bankCredit.updateMany({ where: { id: credit.id, paymentId: credit.paymentId }, data: { reviewNote: note } });
      return { matched: false, reviewNote: note };
    }
    const note = payment?.status === "COMPLETED" ? null : (credit.reviewNote || "Claimed payment needs admin review.");
    if (note && !credit.reviewNote) await prisma.bankCredit.updateMany({ where: { id: credit.id, paymentId: credit.paymentId }, data: { reviewNote: note } });
    return { matched: true, reviewNote: note };
  }
  if (credit.shopOrderId) {
    const order = await prisma.shopOrder.findUnique({ where: { id: credit.shopOrderId }, select: { paymentStatus: true } });
    if (order?.paymentStatus === "PENDING") {
      try {
        const result = await fulfillPaidShopOrder({ orderId: credit.shopOrderId, expectedAmountPaise: credit.amountPaise, utr: credit.utr, verifiedVia: credit.source });
        if (result.ok) {
          await prisma.bankCredit.updateMany({ where: { id: credit.id, shopOrderId: credit.shopOrderId }, data: { reviewNote: null } });
          return { matched: true, reviewNote: null };
        }
      } catch { /* keep the claim so the next reconciliation can retry */ }
      const note = "Credit is claimed; shop order fulfillment will retry.";
      await prisma.bankCredit.updateMany({ where: { id: credit.id, shopOrderId: credit.shopOrderId }, data: { reviewNote: note } });
      return { matched: false, reviewNote: note };
    }
    const note = order?.paymentStatus === "PAID" ? null : (credit.reviewNote || "Claimed shop order needs admin review.");
    if (note && !credit.reviewNote) await prisma.bankCredit.updateMany({ where: { id: credit.id, shopOrderId: credit.shopOrderId }, data: { reviewNote: note } });
    return { matched: true, reviewNote: note };
  }
  const before = new Date(credit.receivedAt.getTime() + 3 * 60_000);
  const after = new Date(credit.receivedAt.getTime() - 24 * 60 * 60_000);
  const [pendingPayments, pendingShopOrders] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING", method: "upi", createdAt: { lt: before }, expiresAt: { gt: after } },
      select: { id: true, amount: true, status: true, method: true, reference: true, createdAt: true, expiresAt: true },
      take: 500
    }),
    prisma.shopOrder.findMany({
      where: { status: "PENDING_PAYMENT", paymentStatus: "PENDING", createdAt: { lt: before }, expiresAt: { gt: after } },
      select: { id: true, advancePaise: true, paymentStatus: true, utr: true, createdAt: true, expiresAt: true },
      take: 500
    })
  ]);
  const pending = [
    ...pendingPayments,
    ...pendingShopOrders.map((order) => ({
      id: order.id, paymentType: "shopOrder" as const, amount: order.advancePaise, status: order.paymentStatus,
      method: "upi", reference: order.utr, createdAt: order.createdAt, expiresAt: order.expiresAt
    }))
  ];
  const decision = matchCredit({ amountPaise: credit.amountPaise, utr: credit.utr, receivedAt: credit.receivedAt }, pending);
  if (!decision.paymentId) {
    if (decision.reviewNote) await prisma.bankCredit.updateMany({
      where: { id: credit.id, paymentId: null, shopOrderId: null }, data: { reviewNote: decision.reviewNote }
    });
    return { matched: false, reviewNote: decision.reviewNote };
  }

  const paymentCredit = decision.paymentType === "shopOrder"
    ? await prisma.bankCredit.findUnique({ where: { shopOrderId: decision.paymentId }, select: { id: true } })
    : await prisma.bankCredit.findUnique({ where: { paymentId: decision.paymentId }, select: { id: true } });
  if (!canClaimCreditPair({ creditId: credit.id, creditPaymentId: credit.paymentId || credit.shopOrderId, paymentId: decision.paymentId, paymentCreditId: paymentCredit?.id || null })) {
    const note = "Another bank credit already claimed this payment.";
    await prisma.bankCredit.updateMany({ where: { id: credit.id, paymentId: null, shopOrderId: null }, data: { reviewNote: note } });
    return { matched: false, reviewNote: note };
  }

  // Conditional claim plus unique target columns make this a one-credit/one-order lock.
  let claimed;
  try {
    claimed = await prisma.bankCredit.updateMany({
      where: { id: credit.id, paymentId: null, shopOrderId: null },
      data: { ...(decision.paymentType === "shopOrder" ? { shopOrderId: decision.paymentId } : { paymentId: decision.paymentId }), claimedAt: new Date(), reviewNote: null }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { matched: false, reviewNote: "Another bank credit already claimed this payment." };
    }
    throw error;
  }
  if (!claimed.count) {
    const current = await prisma.bankCredit.findUnique({ where: { id: credit.id }, select: { paymentId: true, shopOrderId: true, reviewNote: true } });
    return { matched: !!(current?.paymentId || current?.shopOrderId), reviewNote: current?.reviewNote || null };
  }

  try {
    const result = decision.paymentType === "shopOrder"
      ? await fulfillPaidShopOrder({ orderId: decision.paymentId, expectedAmountPaise: credit.amountPaise, utr: credit.utr, verifiedVia: credit.source })
      : await activateCompletedPayment({
          paymentId: decision.paymentId,
          expectedAmountPaise: credit.amountPaise,
          utr: credit.utr,
          verifiedVia: credit.source,
          matchedEmail: `bank-credit:${credit.id}`
        });
    if (!result.ok) throw new Error(result.error);
    return { matched: true, reviewNote: null };
  } catch (error) {
    // Keep the source credit available for admin review if activation did not commit.
    await prisma.bankCredit.updateMany({
      where: decision.paymentType === "shopOrder" ? { id: credit.id, shopOrderId: decision.paymentId } : { id: credit.id, paymentId: decision.paymentId },
      data: { ...(decision.paymentType === "shopOrder" ? { shopOrderId: null } : { paymentId: null }), claimedAt: null, reviewNote: error instanceof Error ? error.message.slice(0, 180) : "Activation failed." }
    });
    return { matched: false, reviewNote: "Payment activation failed; credit remains for review." };
  }
}

export async function matchPendingBankCreditsForShopOrder(orderId: string) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, paymentStatus: true, advancePaise: true, utr: true, createdAt: true, expiresAt: true } });
  if (!order || order.status !== "PENDING_PAYMENT" || order.paymentStatus !== "PENDING" || !order.expiresAt) return false;
  const credits = await prisma.bankCredit.findMany({
    where: {
      paymentId: null,
      shopOrderId: null,
      receivedAt: { gt: new Date(order.createdAt.getTime() - 3 * 60_000), lt: new Date(order.expiresAt.getTime() + 24 * 60 * 60_000) },
      OR: [{ amountPaise: order.advancePaise }, ...(order.utr ? [{ utr: order.utr.replace(/\D/g, "") }] : [])]
    },
    select: { id: true },
    take: 50
  });
  for (const credit of credits) if ((await matchBankCredit(credit.id)).matched) return true;
  return false;
}

export async function recordBankCredit(input: NewBankCredit): Promise<{ id: string; duplicate: boolean; matched: boolean; reviewNote: string | null }> {
  const existing = await prisma.bankCredit.findFirst({
    where: { OR: [
      { rawHash: input.rawHash },
      ...(input.signature ? [{ signature: input.signature }] : []),
      ...(input.utr ? [{ utr: input.utr }] : [])
    ] }
  });
  if (existing) {
    if (input.utr && existing.utr === input.utr && existing.amountPaise !== input.amountPaise && !existing.paymentId && !existing.shopOrderId) {
      await prisma.bankCredit.update({ where: { id: existing.id }, data: { reviewNote: "The same UTR arrived with conflicting amounts from different sources." } });
    }
    const result = await matchBankCredit(existing.id);
    return { id: existing.id, duplicate: true, ...result };
  }

  try {
    const created = await prisma.bankCredit.create({ data: {
      source: input.source,
      amountPaise: input.amountPaise,
      utr: input.utr || null,
      sender: input.sender.slice(0, 160),
      payerName: input.payerName?.slice(0, 64) || null,
      receivedAt: input.receivedAt,
      rawHash: input.rawHash,
      signature: input.signature || null,
      bodyExcerpt: input.bodyExcerpt.slice(0, 1200),
      deviceId: input.deviceId || null
    } });
    const result = await matchBankCredit(created.id);
    return { id: created.id, duplicate: false, ...result };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const duplicate = await prisma.bankCredit.findFirst({
      where: { OR: [
        { rawHash: input.rawHash },
        ...(input.signature ? [{ signature: input.signature }] : []),
        ...(input.utr ? [{ utr: input.utr }] : [])
      ] }
    });
    if (!duplicate) throw error;
    if (input.utr && duplicate.utr === input.utr && duplicate.amountPaise !== input.amountPaise && !duplicate.paymentId && !duplicate.shopOrderId) {
      await prisma.bankCredit.update({
        where: { id: duplicate.id },
        data: { reviewNote: "The same UTR arrived with conflicting amounts from different sources." }
      });
    }
    const result = await matchBankCredit(duplicate.id);
    return { id: duplicate.id, duplicate: true, ...result };
  }
}

export async function matchAllUnclaimedBankCredits() {
  const rows = await prisma.bankCredit.findMany({
    where: {
      OR: [
        { paymentId: null, shopOrderId: null },
        { payment: { is: { status: "PENDING" } } },
        { shopOrder: { is: { paymentStatus: "PENDING" } } }
      ]
    },
    orderBy: { receivedAt: "asc" }, take: 500, select: { id: true }
  });
  let matched = 0;
  for (const row of rows) if ((await matchBankCredit(row.id)).matched) matched++;
  return { checked: rows.length, matched };
}

export async function approvePaymentFromBankCredit(paymentId: string, creditId: string) {
  const [payment, credit] = await Promise.all([
    prisma.payment.findUnique({ where: { id: paymentId } }),
    prisma.bankCredit.findUnique({ where: { id: creditId } })
  ]);
  if (!payment || !credit) return { ok: false as const, status: 404, error: "Payment or bank credit not found." };
  if (payment.status !== "PENDING" || payment.method !== "upi") return { ok: false as const, status: 409, error: "Only a pending UPI payment can use a bank credit." };
  if (credit.paymentId || credit.shopOrderId) return { ok: false as const, status: 409, error: "Bank credit is already claimed." };
  const decision = matchCredit(credit, [payment]);
  if (decision.paymentId !== payment.id) return { ok: false as const, status: 409, error: decision.reviewNote || "Credit does not match this payment." };
  const paymentCredit = await prisma.bankCredit.findUnique({ where: { paymentId: payment.id }, select: { id: true } });
  if (!canClaimCreditPair({ creditId: credit.id, creditPaymentId: credit.paymentId, paymentId: payment.id, paymentCreditId: paymentCredit?.id || null })) {
    return { ok: false as const, status: 409, error: "Another bank credit already claimed this payment." };
  }
  let claimed;
  try {
    claimed = await prisma.bankCredit.updateMany({
      where: { id: credit.id, paymentId: null, shopOrderId: null, amountPaise: payment.amount },
      data: { paymentId: payment.id, claimedAt: new Date(), reviewNote: null }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, status: 409, error: "Another bank credit already claimed this payment." };
    }
    throw error;
  }
  if (!claimed.count) return { ok: false as const, status: 409, error: "Bank credit was claimed by another request." };
  try {
    const result = await activateCompletedPayment({
      paymentId: payment.id,
      expectedAmountPaise: credit.amountPaise,
      utr: credit.utr,
      verifiedVia: `admin-${credit.source}`,
      matchedEmail: `bank-credit:${credit.id}`
    });
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const, paymentId: payment.id, creditId: credit.id };
  } catch (error) {
    await prisma.bankCredit.updateMany({
      where: { id: credit.id, paymentId: payment.id },
      data: { paymentId: null, claimedAt: null, reviewNote: "Admin approval did not activate the payment." }
    });
    return { ok: false as const, status: 409, error: error instanceof Error ? error.message : "Payment activation failed." };
  }
}

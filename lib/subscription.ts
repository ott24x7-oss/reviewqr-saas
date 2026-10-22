/**
 * Plan activation. One transaction extends the subscription, issues the next
 * GST invoice number, and snapshots the invoice. A completed payment is a no-op.
 */
import { addMonths } from "date-fns";
import { Prisma, type PaymentStatus, type PlanDuration, type SubscriptionTier } from "@prisma/client";
import { prisma } from "./db";
import { getPaymentsConfig } from "./settings";
import { absoluteUrl } from "./utils";
import { limitsForTier, modulesForTier } from "./plans/legacy";
import { extendByReward } from "./plans/quote";
import { grantPlanAccess } from "./plans/snapshot";

export function financialYearLabel(date: Date): string {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  const end = String((start + 1) % 100).padStart(2, "0");
  return `${start}-${end}`;
}

export function formatInvoiceNumber(fy: string, sequence: number, prefix = "INV"): string {
  const safe = /^[A-Z]{2,4}$/.test(prefix) ? prefix : "INV";
  return `${safe}-${fy}-${String(sequence).padStart(4, "0")}`;
}

/** Extend from the later of now and the current end, by whole calendar months. */
export function extendSubscriptionEnd(
  currentEnd: Date | null | undefined,
  months: number,
  now = new Date()
): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return addMonths(base, Math.max(1, Math.floor(months) || 1));
}

/** Amount is GST-inclusive. Unknown buyer state is treated as the seller's state. */
export function splitGst(amountPaise: number, ratePercent: number, sameState: boolean) {
  const rate = ratePercent > 0 ? ratePercent : 18;
  const taxable = Math.round((amountPaise * 100) / (100 + rate));
  const tax = Math.max(0, amountPaise - taxable);
  if (!sameState) return { taxable, cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { taxable, cgst, sgst: tax - cgst, igst: 0 };
}

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
  prefix = "INV"
): Promise<string> {
  const fy = financialYearLabel(now);
  await tx.$executeRaw`
    INSERT INTO "InvoiceSequence" ("fy", "lastNumber") VALUES (${fy}, 0)
    ON CONFLICT ("fy") DO NOTHING
  `;
  const rows = await tx.$queryRaw<Array<{ lastNumber: number }>>`
    SELECT "lastNumber" FROM "InvoiceSequence" WHERE "fy" = ${fy} FOR UPDATE
  `;
  const next = (rows[0]?.lastNumber ?? 0) + 1;
  await tx.invoiceSequence.update({ where: { fy }, data: { lastNumber: next } });
  return formatInvoiceNumber(fy, next, prefix);
}

export type ActivateInput = {
  paymentId: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  utr?: string | null;
  verifiedVia: string;
  matchedEmail?: string | null;
  payerVpa?: string | null;
  expectedAmountPaise?: number;
  expectedOrderId?: string;
  allowStatuses?: PaymentStatus[];
};

export type ActivateResult =
  | { ok: true; already: boolean; expiresAt: Date; invoiceNumber: string | null }
  | { ok: false; error: string };

export async function activateCompletedPayment(input: ActivateInput): Promise<ActivateResult> {
  const cfg = await getPaymentsConfig();
  const allowed = input.allowStatuses ?? ["PENDING", "QUEUED"];

  const result = await prisma.$transaction(async (tx): Promise<ActivateResult> => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        status: PaymentStatus;
        providerPaymentId: string | null;
        invoiceNumber: string | null;
        amount: number;
        userId: string;
        tier: SubscriptionTier;
        periodMonths: number;
        planId: string | null;
        duration: PlanDuration | null;
        modules: string[] | null;
        limits: Prisma.JsonValue | null;
        creditPaise: number;
      }>
    >`
      SELECT "id", "status", "providerPaymentId", "invoiceNumber", "amount", "userId", "tier", "periodMonths",
             "planId", "duration", "modules", "limits", "creditPaise"
      FROM "Payment"
      WHERE "id" = ${input.paymentId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return { ok: false, error: "Payment not found" };

    if (row.status === "COMPLETED") {
      if (!input.providerPaymentId || row.providerPaymentId === input.providerPaymentId) {
        const user = await tx.user.findUnique({
          where: { id: row.userId },
          select: { subscriptionEndsAt: true }
        });
        return {
          ok: true,
          already: true,
          expiresAt: user?.subscriptionEndsAt ?? new Date(),
          invoiceNumber: row.invoiceNumber
        };
      }
      return { ok: false, error: "Payment already completed with a different reference" };
    }

    if (row.status === "REFUNDED") return { ok: false, error: "Payment was refunded" };
    if (!allowed.includes(row.status)) {
      return { ok: false, error: "Payment cannot be activated" };
    }
    if (input.expectedAmountPaise != null && input.expectedAmountPaise !== row.amount) {
      return { ok: false, error: "Amount mismatch" };
    }
    if (input.expectedOrderId && input.expectedOrderId !== row.id) {
      return { ok: false, error: "Order mismatch" };
    }
    if (input.providerPaymentId) {
      const clash = await tx.payment.findFirst({
        where: { providerPaymentId: input.providerPaymentId, NOT: { id: row.id } },
        select: { id: true }
      });
      if (clash) return { ok: false, error: "Payment reference already used" };
    }

    const user = await tx.user.findUnique({ where: { id: row.userId } });
    if (!user) return { ok: false, error: "User not found" };

    const now = new Date();
    const lifetime = row.duration === "LIFETIME" || row.periodMonths === 0;
    let expiresAt: Date | null = lifetime
      ? null
      : row.creditPaise > 0
        ? addMonths(now, Math.max(1, row.periodMonths || 1))
        : extendSubscriptionEnd(user.subscriptionEndsAt, row.periodMonths || 1, now);
    const credit = await tx.referralCredit.findUnique({ where: { userId: user.id } });
    if (expiresAt && credit && (credit.months > 0 || credit.days > 0)) {
      expiresAt = extendByReward(expiresAt, credit.months, credit.days);
      await tx.referralCredit.update({ where: { userId: user.id }, data: { months: 0, days: 0 } });
    }
    const invoiceNumber = row.invoiceNumber ?? (await nextInvoiceNumber(tx, now));
    const split = splitGst(row.amount, cfg.gstRate || 18, true);

    await tx.payment.update({
      where: { id: row.id },
      data: {
        status: "COMPLETED",
        providerPaymentId: input.providerPaymentId || undefined,
        providerOrderId: input.providerOrderId || undefined,
        utr: input.utr || undefined,
        verifiedVia: input.verifiedVia,
        matchedEmail: input.matchedEmail ? input.matchedEmail.slice(0, 200) : undefined,
        payerVpa: input.payerVpa ? input.payerVpa.slice(0, 120) : undefined,
        invoiceNumber,
        invoiceUrl: absoluteUrl(`/api/billing/invoices/${row.id}`),
        invoiceBuyerName: user.name || user.email,
        invoiceBuyerGstin: null,
        invoiceSellerName: cfg.sellerLegalName || "ReviewQR",
        invoiceSellerGstin: cfg.sellerGstin || "",
        invoicePlaceOfSupply: cfg.sellerState || "",
        invoiceTaxablePaise: split.taxable,
        invoiceCgstPaise: split.cgst,
        invoiceSgstPaise: split.sgst,
        invoiceIgstPaise: split.igst,
        invoiceIssuedAt: now,
        queuePosition: null
      }
    });

    const modules = row.modules && row.modules.length ? row.modules : modulesForTier(row.tier);
    let rawLimits: unknown = row.limits;
    if (typeof rawLimits === "string") {
      try {
        rawLimits = JSON.parse(rawLimits);
      } catch {
        rawLimits = null;
      }
    }
    const limits = rawLimits && typeof rawLimits === "object" ? rawLimits : limitsForTier(row.tier);
    await grantPlanAccess(tx, {
      userId: user.id,
      tier: row.tier,
      status: "ACTIVE",
      endsAt: expiresAt,
      startsAt: now,
      planId: row.planId,
      duration: row.duration,
      modules,
      limits,
      pricePaise: row.amount + Math.max(0, row.creditPaise || 0),
      clearPending: true
    });

    return { ok: true, already: false, expiresAt: expiresAt ?? now, invoiceNumber };
  });

  if (result.ok && !result.already) {
    try {
      const { settleConfirmedPayment } = await import("./plans/settle");
      await settleConfirmedPayment(input.paymentId);
    } catch (error) {
      console.warn("[plans] could not record commission", error);
    }
  }
  return result;
}

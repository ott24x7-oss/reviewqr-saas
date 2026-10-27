import type { CommissionStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { activateManually, reconcilePayment } from "@/lib/manual-payments";
import { approveDueCommissions, outstandingClawbackByAgent, reverseCommissionsForPayment } from "@/lib/plans/ledger";
import { payApprovedCommissions } from "@/lib/plans/payout";
import { reverseReferralForPayment } from "@/lib/plans/rewards";
import { notifyUser } from "@/lib/plans/notify";
import { absoluteUrl } from "@/lib/utils";
import { indiaDate } from "./range";
import { maskPhone } from "./mask";
import { queueAdminPush } from "./push";
import { readOffset } from "./directory";

const STATUSES: PaymentStatus[] = ["PENDING", "QUEUED", "COMPLETED", "FAILED", "REFUNDED", "EXPIRED", "CANCELLED"];
const PROVIDERS: PaymentProvider[] = ["RAZORPAY", "STRIPE", "MANUAL", "UPI", "USDT", "YOUPI"];

function maskRef(value: string | null) {
  if (!value) return null;
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

function paymentWhere(search: URLSearchParams) {
  const status = search.get("status");
  const provider = search.get("provider");
  const planId = (search.get("planId") || "").trim();
  const q = (search.get("q") || "").trim();
  if (status && !STATUSES.includes(status as PaymentStatus)) return fail(400, "Unknown payment status");
  if (provider && !PROVIDERS.includes(provider as PaymentProvider)) return fail(400, "Unknown payment gateway");
  const from = search.get("from") ? indiaDate(search.get("from")) : null;
  const to = search.get("to") ? indiaDate(search.get("to")) : null;
  if ((search.get("from") && !from) || (search.get("to") && !to)) return fail(400, "Use from and to as YYYY-MM-DD");
  return ok({
    ...(status ? { status: status as PaymentStatus } : {}),
    ...(provider ? { provider: provider as PaymentProvider } : {}),
    ...(planId ? { planId } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(to.getTime() + 86400000) } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { utr: { contains: q, mode: "insensitive" as const } },
            { invoiceNumber: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } }
          ]
        }
      : {})
  });
}

export async function listAdminPayments(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const where = paymentWhere(search);
  if (!where.ok) return where;
  const listed = await takePage(
    () =>
      prisma.payment.findMany({
        where: where.data,
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit),
        select: {
          id: true,
          amount: true,
          status: true,
          provider: true,
          createdAt: true,
          utr: true,
          invoiceNumber: true,
          user: { select: { email: true, phone: true } },
          plan: { select: { nameEn: true } }
        }
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
      utr: row.utr,
      invoiceNumber: row.invoiceNumber,
      email: row.user.email,
      phone: maskPhone(row.user.phone),
      plan: row.plan?.nameEn || null
    })),
    nextCursor: listed.data.nextCursor
  });
}

export async function loadAdminPayment(id: string) {
  const row = await prisma.payment.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, phone: true, name: true } }, plan: { select: { nameEn: true } } }
  });
  if (!row) return fail(404, "Payment not found");
  return ok({
    id: row.id,
    amount: row.amount,
    status: row.status,
    provider: row.provider,
    providerOrderId: row.providerOrderId,
    providerPaymentId: row.providerPaymentId,
    utr: row.utr,
    refundUtr: row.refundUtr,
    invoiceNumber: row.invoiceNumber,
    invoiceUrl: row.invoiceUrl,
    payerVpa: maskRef(row.payerVpa),
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
    plan: row.plan?.nameEn || null,
    user: { id: row.user.id, name: row.user.name, email: row.user.email, phone: maskPhone(row.user.phone) }
  });
}

export async function approveAdminPayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return fail(404, "Payment not found");
  if (payment.provider === "YOUPI") {
    return fail(409, "YouPI payments are confirmed by the gateway. Use refund only after they complete.");
  }
  try {
    const approved = await activateManually(payment.id);
    if (!approved) return fail(409, "Payment cannot be approved");
  } catch (error) {
    return fail(409, error instanceof Error ? error.message : "Payment cannot be approved");
  }
  return ok({ before: { status: payment.status }, after: { status: "COMPLETED" } });
}

export async function rejectAdminPayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!payment) return fail(404, "Payment not found");
  const updated = await prisma.payment.updateMany({
    where: { id, status: { in: ["PENDING", "QUEUED"] } },
    data: { status: "FAILED" }
  });
  if (!updated.count) return fail(409, "Only a pending payment can be rejected");
  void queueAdminPush({
    event: "failedPayment",
    collapseKey: `failed:${id}`,
    title: "Payment failed",
    body: "A payment was marked failed.",
    windowSeconds: 86400
  });
  return ok({ before: { status: payment.status }, after: { status: "FAILED" } });
}

export async function refundAdminPayment(id: string, refundUtr: string) {
  const utr = refundUtr.trim();
  if (utr.length < 6) return fail(400, "Enter the refund UTR");
  const payment = await prisma.payment.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!payment) return fail(404, "Payment not found");
  const updated = await prisma.payment.updateMany({
    where: { id, status: "COMPLETED" },
    data: { status: "REFUNDED", refundUtr: utr.slice(0, 120) }
  });
  if (!updated.count) return fail(409, "Only a completed payment can be refunded");
  await reverseCommissionsForPayment(id);
  await reverseReferralForPayment(id);
  return ok({ before: { status: payment.status }, after: { status: "REFUNDED", refundUtr: utr } });
}

export async function reconcileAdminPayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return fail(404, "Payment not found");
  const changed = await reconcilePayment(payment);
  const after = await prisma.payment.findUnique({ where: { id }, select: { status: true } });
  return ok({ changed, before: { status: payment.status }, after: { status: after?.status || payment.status } });
}

export async function resendAdminInvoice(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { id: true, userId: true, invoiceNumber: true, amount: true }
  });
  if (!payment) return fail(404, "Payment not found");
  const link = absoluteUrl(`/api/billing/invoices/${payment.id}`);
  await notifyUser(payment.userId, "Your QR24x7 invoice", `Invoice ${payment.invoiceNumber || payment.id}: ${link}`);
  return ok({ link });
}

export async function listAdminCommissions(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const status = (search.get("status") || "").trim();
  const known = ["PENDING", "APPROVED", "PAID", "REVERSED", "LEGACY_UNSETTLED"];
  if (status && !known.includes(status)) return fail(400, "Unknown commission status");
  const listed = await takePage(
    () =>
      prisma.shopCommission.findMany({
        where: status ? { status: status as CommissionStatus } : {},
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit),
        select: {
          id: true,
          agentId: true,
          kind: true,
          amountPaise: true,
          status: true,
          createdAt: true,
          agent: { select: { name: true } }
        }
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      agentId: row.agentId,
      agentName: row.agent.name || "Agent",
      kind: row.kind,
      amountPaise: row.amountPaise,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    })),
    nextCursor: listed.data.nextCursor
  });
}

export async function approveAdminCommissions(agentId: string) {
  const count = await approveDueCommissions(new Date(), agentId);
  return ok({ count, before: { status: "PENDING" }, after: { status: "APPROVED", count } });
}

const paymentSelect = {
  id: true,
  amount: true,
  status: true,
  provider: true,
  createdAt: true,
  utr: true,
  invoiceNumber: true,
  user: { select: { email: true, phone: true, name: true } },
  plan: { select: { nameEn: true } }
} as const;

export async function listAdminPaymentsPage(search: URLSearchParams, mode: "page" | "export" = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const where = paymentWhere(search);
  if (!where.ok) return where;
  const direction = search.get("dir") === "asc" ? "asc" : "desc";
  const orderBy = search.get("sort") === "amount" ? { amount: direction as "asc" | "desc" } : { createdAt: direction as "asc" | "desc" };
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where: where.data }),
    prisma.payment.findMany({
      where: where.data,
      orderBy,
      skip: page.data.skip,
      take: page.data.limit,
      select: paymentSelect
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
      utr: row.utr,
      invoiceNumber: row.invoiceNumber,
      name: row.user.name,
      email: row.user.email,
      phone: maskPhone(row.user.phone),
      plan: row.plan?.nameEn || null
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}

export async function pageCommissionReport(search: URLSearchParams, mode: "page" | "export" = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const q = (search.get("q") || "").trim();
  const where = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" as const } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } }
        ]
      }
    : {};
  const [total, agents] = await Promise.all([
    prisma.agentProfile.count({ where }),
    prisma.agentProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page.data.skip,
      take: page.data.limit,
      include: { user: { select: { id: true, name: true, phone: true, email: true } } }
    })
  ]);
  const ids = agents.map((agent) => agent.userId);
  const grouped = ids.length
    ? await prisma.shopCommission.groupBy({
        by: ["agentId", "status"],
        where: { agentId: { in: ids } },
        _sum: { amountPaise: true }
      })
    : [];
  const sales = new Map<string, { amount: number; count: number }>();
  await Promise.all(
    ids.map(async (agentId) => {
      const row = await prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          user: { businesses: { some: { agentId, archived: false } } }
        },
        _sum: { amount: true },
        _count: { _all: true }
      });
      sales.set(agentId, { amount: row._sum.amount || 0, count: row._count._all });
    })
  );
  const bucket = (agentId: string, status: string) =>
    grouped.find((row) => row.agentId === agentId && row.status === status)?._sum.amountPaise || 0;
  const clawback = await outstandingClawbackByAgent(ids);
  return ok({
    items: agents.map((agent) => ({
      agentId: agent.userId,
      profileId: agent.id,
      name: agent.user.name || "Agent",
      phone: maskPhone(agent.user.phone),
      email: agent.user.email,
      code: agent.code,
      salesPaise: sales.get(agent.userId)?.amount || 0,
      salesCount: sales.get(agent.userId)?.count || 0,
      pendingPaise: bucket(agent.userId, "PENDING"),
      approvedPaise: bucket(agent.userId, "APPROVED"),
      paidPaise: bucket(agent.userId, "PAID"),
      legacyPaise: bucket(agent.userId, "LEGACY_UNSETTLED"),
      clawbackPaise: clawback.get(agent.userId) || 0
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > agents.length
  });
}

export async function listLegacyCommissions(search: URLSearchParams) {
  const page = readOffset(search, "page");
  if (!page.ok) return page;
  const legacyPage = Number(search.get("legacyPage") || "1");
  const limit = page.data.limit;
  const skip = (Number.isFinite(legacyPage) && legacyPage > 0 ? legacyPage : 1) - 1;
  const where = { status: "LEGACY_UNSETTLED" as const };
  const [total, rows] = await Promise.all([
    prisma.shopCommission.count({ where }),
    prisma.shopCommission.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: skip * limit,
      take: limit,
      include: { agent: { select: { name: true, phone: true, email: true } } }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      amountPaise: row.amountPaise,
      name: row.agent.name || "Agent",
      phone: maskPhone(row.agent.phone),
      email: row.agent.email
    })),
    total,
    page: skip + 1,
    pageSize: limit
  });
}

export async function payAdminCommissions(agentId: string, utr: string) {
  const result = await payApprovedCommissions({ agentId, utr, paidAt: new Date() });
  if (!result.ok) return fail(400, result.error);
  return ok({
    before: { status: "APPROVED" },
    after: {
      status: "PAID",
      payoutId: result.payoutId,
      grossPaise: result.grossPaise,
      tdsPaise: result.tdsPaise,
      netPaise: result.netPaise
    }
  });
}

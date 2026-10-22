/** Admin shop figures for the server's calendar month. Founder adds nothing to MRR. */
import { prisma } from "@/lib/db";
import { getPricingConfig } from "@/lib/settings";
import { isLowStock } from "./catalog";

function monthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const label = start.toLocaleString("en-IN", { month: "long", year: "numeric" });
  return { start, end, label };
}

export async function shopMonthReport(now = new Date()) {
  const { start, end, label } = monthRange(now);
  const dueBy = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [orders, credits, commissions, pricing, activeTiers, renewals, variants] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { paymentStatus: "PAID", paidAt: { gte: start, lt: end } },
      select: {
        totalPaise: true,
        taxablePaise: true,
        cgstPaise: true,
        sgstPaise: true,
        igstPaise: true,
        lines: { select: { sku: true, name: true, qty: true } }
      }
    }),
    prisma.shopCreditNote.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        number: true,
        reason: true,
        amountPaise: true,
        taxablePaise: true,
        cgstPaise: true,
        sgstPaise: true,
        igstPaise: true,
        orderId: true
      }
    }),
    prisma.shopCommission.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        agentId: true,
        kind: true,
        amountPaise: true,
        agent: { select: { name: true, email: true } }
      }
    }),
    getPricingConfig(),
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      where: { subscriptionStatus: "ACTIVE", deletedAt: null },
      _count: { _all: true }
    }),
    prisma.user.findMany({
      where: {
        subscriptionStatus: "ACTIVE",
        deletedAt: null,
        subscriptionTier: { not: "FOUNDER" },
        subscriptionEndsAt: { gte: now, lte: dueBy }
      },
      select: { id: true, email: true, name: true, subscriptionTier: true, subscriptionEndsAt: true },
      orderBy: { subscriptionEndsAt: "asc" },
      take: 50
    }),
    prisma.catalogVariant.findMany({
      where: { active: true },
      select: { sku: true, name: true, stock: true, lowStockAt: true }
    })
  ]);

  const gst = orders.reduce(
    (sum, order) => ({
      revenuePaise: sum.revenuePaise + order.totalPaise,
      taxablePaise: sum.taxablePaise + order.taxablePaise,
      cgstPaise: sum.cgstPaise + order.cgstPaise,
      sgstPaise: sum.sgstPaise + order.sgstPaise,
      igstPaise: sum.igstPaise + order.igstPaise
    }),
    { revenuePaise: 0, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 }
  );
  const creditGst = credits.reduce(
    (sum, note) => ({
      amountPaise: sum.amountPaise + note.amountPaise,
      taxablePaise: sum.taxablePaise + note.taxablePaise,
      cgstPaise: sum.cgstPaise + note.cgstPaise,
      sgstPaise: sum.sgstPaise + note.sgstPaise,
      igstPaise: sum.igstPaise + note.igstPaise
    }),
    { amountPaise: 0, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 }
  );

  const productMap = new Map<string, { sku: string; name: string; qty: number }>();
  for (const order of orders) {
    for (const line of order.lines) {
      const current = productMap.get(line.sku) ?? { sku: line.sku, name: line.name, qty: 0 };
      current.qty += line.qty;
      productMap.set(line.sku, current);
    }
  }
  const products = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);

  const agentMap = new Map<string, { agentId: string; name: string; email: string; amountPaise: number; orders: number; renewals: number }>();
  for (const row of commissions) {
    const current = agentMap.get(row.agentId) ?? {
      agentId: row.agentId,
      name: row.agent.name || row.agent.email,
      email: row.agent.email,
      amountPaise: 0,
      orders: 0,
      renewals: 0
    };
    current.amountPaise += row.amountPaise;
    if (row.kind === "ORDER") current.orders += 1;
    if (row.kind === "RENEWAL") current.renewals += 1;
    agentMap.set(row.agentId, current);
  }
  const agents = [...agentMap.values()].sort((a, b) => b.amountPaise - a.amountPaise);

  let mrrPaise = 0;
  for (const row of activeTiers) {
    mrrPaise += (pricing[row.subscriptionTier]?.monthly ?? 0) * row._count._all;
  }

  return {
    label,
    orders: orders.length,
    ...gst,
    credits: { count: credits.length, ...creditGst, notes: credits },
    products,
    agents,
    mrrPaise,
    renewals,
    lowStock: variants.filter((variant) => isLowStock(variant.stock, variant.lowStockAt))
  };
}

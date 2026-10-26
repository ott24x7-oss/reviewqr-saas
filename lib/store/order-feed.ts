import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok } from "../api/result";
import { prisma } from "../db";
import { featureBlock } from "../plans/feature-gate";
import { moduleBlock } from "../plans/entitlements";
import { accessRole, allows, readableBusinessWhere } from "../tenant";
import { kolkataDayWindow, type DaySummary } from "./day";
import { toOrderCard, type OrderCard } from "./order-status";

export type { DaySummary };

/**
 * Block the order list only when this person can read no Store business.
 * Owning one locked business does not hide a Store business they can already read.
 */
export async function ownedStoreBlock(userId: string) {
  const locked = await featureBlock(userId, "orders");
  if (!locked) return null;
  const readable = await prisma.business.findFirst({
    where: await storeReadableWhere(userId),
    select: { id: true }
  });
  if (readable) return null;
  const owned = await prisma.business.findFirst({
    where: { ownerId: userId, archived: false },
    select: { id: true }
  });
  if (!owned) return null;
  return locked;
}

async function storeReadableWhere(userId: string) {
  const rows = await prisma.business.findMany({
    where: readableBusinessWhere(userId),
    select: { ownerId: true },
    distinct: ["ownerId"]
  });
  const ownerIds: string[] = [];
  for (const row of rows) {
    if (!(await moduleBlock(row.ownerId, "STORE"))) ownerIds.push(row.ownerId);
  }
  return { ...readableBusinessWhere(userId), ownerId: { in: ownerIds } };
}

/** Today's paid-or-open orders in Asia/Kolkata. Rejected orders are left out. */
export async function loadDaySummary(userId: string, now = new Date()): Promise<DaySummary> {
  const { start, end } = kolkataDayWindow(now);
  const totals = await prisma.menuOrder.aggregate({
    where: {
      business: await storeReadableWhere(userId),
      status: { not: "REJECTED" },
      createdAt: { gte: start, lt: end }
    },
    _sum: { totalPaise: true },
    _count: { id: true }
  });
  return { count: totals._count.id, totalPaise: totals._sum.totalPaise || 0 };
}

/** Latest orders this user can read. Pass an id to load one card after a status change. */
export async function loadOrderCards(userId: string, orderId?: string): Promise<OrderCard[]> {
  const orders = await prisma.menuOrder.findMany({
    where: {
      business: await storeReadableWhere(userId),
      ...(orderId ? { id: orderId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: orderId ? 1 : 50,
    include: {
      business: {
        select: {
          name: true,
          ownerId: true,
          agentId: true,
          members: { where: { userId }, select: { role: true }, take: 1 }
        }
      }
    }
  });
  return orders.map((order) => {
    const role = accessRole(order.business.ownerId, userId, order.business.members[0]?.role, order.business.agentId);
    return toOrderCard(
      {
        id: order.id,
        number: order.number,
        businessName: order.business.name,
        status: order.status,
        createdAt: order.createdAt,
        customerName: order.customerName,
        place: order.tableOrAddress,
        note: order.note,
        orderType: order.orderType,
        pincode: order.pincode,
        payment: order.payment,
        totalPaise: order.totalPaise,
        items: order.items,
        customerPhone: order.customerPhone,
        consentAt: order.consentAt,
        lang: order.lang
      },
      allows(role, "manage")
    );
  });
}

const orderInclude = (userId: string) => ({
  business: {
    select: {
      name: true,
      ownerId: true,
      agentId: true,
      members: { where: { userId }, select: { role: true }, take: 1 }
    }
  }
});

/** One page of orders this user can read, plus today's summary. */
export async function loadOrderCardPage(
  userId: string,
  page: PageQuery & { businessId?: string | null; since?: Date | null }
) {
  const locked = await ownedStoreBlock(userId);
  if (locked) return locked;
  const readable = await storeReadableWhere(userId);
  const summary = await loadDaySummary(userId);
  const paged = await takePage(async () => {
    const orders = await prisma.menuOrder.findMany({
      where: {
        ...(page.since ? { createdAt: { gte: page.since } } : {}),
        business: {
          ...readable,
          ...(page.businessId ? { id: page.businessId } : {})
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: orderInclude(userId),
      ...cursorQuery(page.cursorId, page.limit)
    });
    return orders.map((order) => {
      const role = accessRole(
        order.business.ownerId,
        userId,
        order.business.members[0]?.role,
        order.business.agentId
      );
      return toOrderCard(
        {
          id: order.id,
          number: order.number,
          businessName: order.business.name,
          status: order.status,
          createdAt: order.createdAt,
          customerName: order.customerName,
          place: order.tableOrAddress,
          note: order.note,
          orderType: order.orderType,
          pincode: order.pincode,
          payment: order.payment,
          totalPaise: order.totalPaise,
          items: order.items,
          customerPhone: order.customerPhone,
          consentAt: order.consentAt,
          lang: order.lang
        },
        allows(role, "manage")
      );
    });
  }, page.limit);
  if (!paged.ok) return paged;
  return ok({ items: paged.data.items, nextCursor: paged.data.nextCursor, summary });
}

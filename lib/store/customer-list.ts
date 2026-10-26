import { prisma } from "../db";
import { accessRole, allows, manageableBusinessWhere, readableBusinessWhere } from "../tenant";
import { isInactive } from "./customers";
import { consentedPhone } from "./order-status";

export type CustomerRow = {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  phone: string;
  orders: number;
  spendPaise: number;
  lastOrderAt: string | null;
  lastOrderLabel: string;
  tags: string[];
  inactive: boolean;
  canManage: boolean;
};

export type CustomerPage = { rows: CustomerRow[]; total: number; pageIndex: number; pageSize: number };

function dayLabel(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

/** Creates a contact for each consented order or review phone that is not saved yet. */
export async function loadCustomers(
  userId: string,
  now = new Date(),
  businessId?: string,
  level: "read" | "manage" = "read"
): Promise<CustomerRow[]> {
  // Exports pass "manage" so STAFF can't download every customer's phone number.
  const scope = level === "manage" ? manageableBusinessWhere(userId) : readableBusinessWhere(userId);
  const [reviews, orders] = await Promise.all([
    prisma.review.findMany({
      where: { business: scope, consentAt: { not: null }, NOT: { customerPhone: null } },
      select: { businessId: true, customerPhone: true, customerName: true }
    }),
    prisma.menuOrder.findMany({
      where: { business: scope, consentAt: { not: null }, NOT: { customerPhone: null } },
      select: { businessId: true, customerPhone: true, customerName: true }
    })
  ]);

  const wanted = new Map<string, { businessId: string; phone: string; name: string | null; source: string }>();
  const add = (businessId: string, raw: string | null, name: string | null, source: string) => {
    const saved = consentedPhone(raw, true);
    if (!saved.customerPhone) return;
    const key = `${businessId}:${saved.customerPhone}`;
    const prev = wanted.get(key);
    wanted.set(key, {
      businessId,
      phone: saved.customerPhone,
      name: (name || prev?.name || "").trim().slice(0, 80) || null,
      source: prev?.source === "order" ? "order" : source
    });
  };
  for (const review of reviews) add(review.businessId, review.customerPhone, review.customerName, "feedback");
  for (const order of orders) add(order.businessId, order.customerPhone, order.customerName, "order");

  const known = await prisma.contact.findMany({
    where: { business: scope, NOT: { phone: null } },
    select: { businessId: true, phone: true }
  });
  const have = new Set(known.map((row) => `${row.businessId}:${row.phone}`));
  for (const row of wanted.values()) {
    if (have.has(`${row.businessId}:${row.phone}`)) continue;
    try {
      await prisma.contact.create({
        data: { businessId: row.businessId, phone: row.phone, name: row.name, source: row.source }
      });
    } catch (err) {
      if (!err || typeof err !== "object" || (err as { code?: string }).code !== "P2002") throw err;
    }
  }

  const [contacts, grouped] = await Promise.all([
    prisma.contact.findMany({
      where: { business: scope, NOT: { phone: null } },
      include: {
        business: {
          select: {
            name: true,
            ownerId: true,
            agentId: true,
            members: { where: { userId }, select: { role: true }, take: 1 }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.menuOrder.groupBy({
      by: ["businessId", "customerPhone"],
      where: { business: scope, consentAt: { not: null }, NOT: { customerPhone: null } },
      _count: { id: true },
      _sum: { totalPaise: true },
      _max: { createdAt: true }
    })
  ]);

  const stats = new Map<string, { orders: number; spendPaise: number; lastOrderAt: Date | null }>();
  for (const row of grouped) {
    if (!row.customerPhone) continue;
    stats.set(`${row.businessId}:${row.customerPhone}`, {
      orders: row._count.id,
      spendPaise: row._sum.totalPaise || 0,
      lastOrderAt: row._max.createdAt
    });
  }

  return contacts.flatMap((contact) => {
    if (!contact.phone) return [];
    const stat = stats.get(`${contact.businessId}:${contact.phone}`);
    const role = accessRole(contact.business.ownerId, userId, contact.business.members[0]?.role, contact.business.agentId);
    if (businessId && contact.businessId !== businessId) return [];
    return [{
      id: contact.id,
      businessId: contact.businessId,
      businessName: contact.business.name,
      name: contact.name || "",
      phone: contact.phone,
      orders: stat?.orders || 0,
      spendPaise: stat?.spendPaise || 0,
      lastOrderAt: stat?.lastOrderAt ? stat.lastOrderAt.toISOString() : null,
      lastOrderLabel: dayLabel(stat?.lastOrderAt || null),
      tags: contact.tags,
      inactive: isInactive(stat?.lastOrderAt || null, now),
      canManage: allows(role, "manage")
    }];
  }).sort((a, b) => (b.lastOrderAt || "").localeCompare(a.lastOrderAt || ""));
}

/** Server-filtered and paginated customer rows for the dashboard table. */
export async function loadCustomerPage(
  userId: string,
  input: { query?: string; pageIndex?: number; pageSize?: number; sort?: string; direction?: "asc" | "desc"; businessId?: string }
): Promise<CustomerPage> {
  const pageSize = Math.max(10, Math.min(50, input.pageSize || 20));
  const pageIndex = Math.max(0, input.pageIndex || 0);
  const query = (input.query || "").trim().toLocaleLowerCase("en-IN");
  const all = await loadCustomers(userId, new Date(), input.businessId);
  const filtered = all.filter((row) => !query || [row.name, row.phone, row.businessName].some((value) => value.toLocaleLowerCase("en-IN").includes(query)));
  const direction = input.direction === "asc" ? 1 : -1;
  const sort = input.sort || "lastOrderAt";
  filtered.sort((a, b) => {
    const left = sort === "name" ? a.name : sort === "business" ? a.businessName : sort === "spendPaise" ? a.spendPaise : sort === "orders" ? a.orders : a.lastOrderAt || "";
    const right = sort === "name" ? b.name : sort === "business" ? b.businessName : sort === "spendPaise" ? b.spendPaise : sort === "orders" ? b.orders : b.lastOrderAt || "";
    return (typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "en-IN")) * direction;
  });
  return { rows: filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), total: filtered.length, pageIndex, pageSize };
}

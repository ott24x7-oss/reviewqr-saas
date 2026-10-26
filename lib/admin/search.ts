import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { maskPhone } from "./mask";

export async function adminSearch(raw: string) {
  const q = raw.trim();
  if (q.length < 2) return fail(400, "Type at least 2 characters");
  const contains = { contains: q, mode: "insensitive" as const };
  const [users, businesses, payments, agents, orders] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [{ email: contains }, { name: contains }, { phone: { contains: q } }]
      },
      take: 8,
      select: { id: true, name: true, email: true, phone: true, role: true }
    }),
    prisma.business.findMany({
      where: { OR: [{ name: contains }, { slug: contains }] },
      take: 8,
      select: { id: true, name: true, slug: true, isActive: true }
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { id: q },
          { utr: contains },
          { refundUtr: contains },
          { providerOrderId: contains },
          { invoiceNumber: contains },
          { reference: contains }
        ]
      },
      take: 8,
      select: { id: true, amount: true, status: true, utr: true, invoiceNumber: true, createdAt: true }
    }),
    prisma.agentProfile.findMany({
      where: { OR: [{ code: contains }, { user: { name: contains } }] },
      take: 8,
      select: { id: true, userId: true, code: true, status: true, user: { select: { name: true, phone: true } } }
    }),
    prisma.shopOrder.findMany({
      where: { OR: [{ id: q }, { invoiceNumber: contains }, { utr: contains }] },
      take: 8,
      select: { id: true, status: true, totalPaise: true, invoiceNumber: true, createdAt: true }
    })
  ]);
  return ok({
    users: users.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: maskPhone(row.phone), role: row.role })),
    businesses,
    payments: payments.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    agents: agents.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name || "Agent",
      code: row.code,
      status: row.status,
      phone: maskPhone(row.user.phone)
    })),
    orders: orders.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  });
}

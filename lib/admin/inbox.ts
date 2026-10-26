import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { setAgentTeamStatus } from "@/lib/plans/admin-team";
import { moveShopOrder } from "@/lib/shop/order-move";
import { isShopOrderStatus, moveError, type ShopOrderStatusName } from "@/lib/shop/order-status";
import { setAdminDeviceStatus } from "./devices";
import { rejectAdminPayment } from "./money";
import { replyToTicket } from "./support-admin";

const SHOP_QUEUE = ["PAID", "APPROVED", "PRINTING", "PACKED"] as const;
const FORWARD = ["PROOF_SENT", "APPROVED", "PRINTING", "NFC_WRITTEN", "PACKED", "PICKUP_SCHEDULED", "SHIPPED", "DELIVERED"];

const refundWhere = {
  status: "OPEN",
  OR: [
    { subject: { contains: "refund", mode: "insensitive" as const } },
    { messages: { some: { body: { contains: "refund", mode: "insensitive" as const } } } }
  ]
};

function card(row: { id: string; title: string; subtitle: string; status: string; createdAt: Date }) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function inboxCountRows() {
  const stale = new Date(Date.now() - 30 * 60 * 1000);
  const [agents, devices, proofs, payoutGroups, refunds, shop, support, failed] = await Promise.all([
    prisma.agentProfile.count({ where: { status: "PENDING" } }),
    prisma.adminDevice.count({ where: { status: "PENDING" } }),
    prisma.shopOrder.count({ where: { status: "PROOF_SENT" } }),
    prisma.shopCommission.groupBy({ by: ["agentId"], where: { status: "APPROVED" }, _sum: { amountPaise: true } }),
    prisma.supportTicket.count({ where: refundWhere }),
    prisma.shopOrder.count({ where: { status: { in: [...SHOP_QUEUE] } } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.payment.count({
      where: { OR: [{ status: "FAILED" }, { status: "PENDING", createdAt: { lt: stale } }] }
    })
  ]);
  return { agents, devices, proofs, payoutGroups, refunds, shop, support, failed };
}

/** Sidebar badge and the queue counts next to matching nav items. One count query. */
export async function adminShellCounts() {
  const counts = await inboxCountRows();
  const inbox =
    counts.agents +
    counts.devices +
    counts.proofs +
    counts.payoutGroups.length +
    counts.refunds +
    counts.shop +
    counts.support +
    counts.failed;
  return {
    inbox,
    "/admin/agents": counts.agents,
    "/admin/apps": counts.devices,
    "/admin/support": counts.support,
    "/admin/production": counts.shop + counts.proofs,
    "/admin/commissions": counts.payoutGroups.length,
    "/admin/payments": counts.failed
  };
}

/** Sidebar badge. Counts only, so the shell does not load a queue. */
export async function adminInboxBadge() {
  const counts = await adminShellCounts();
  return counts.inbox;
}

export async function loadAdminInbox(search: URLSearchParams) {
  const segment = search.get("segment") || "agents";
  const allowed = ["agents", "devices", "proofs", "payouts", "refunds", "shop", "support", "failed"];
  if (!allowed.includes(segment)) return fail(400, "Unknown inbox segment");
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const stale = new Date(Date.now() - 30 * 60 * 1000);
  const { agents, devices, proofs, payoutGroups, refunds, shop, support, failed } = await inboxCountRows();

  let items: Array<{ id: string; title: string; subtitle: string; status: string; createdAt: string }> = [];
  let nextCursor: string | null = null;
  if (segment === "payouts") {
    const ids = payoutGroups.map((row) => row.agentId);
    const users = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const names = new Map(users.map((user) => [user.id, user.name || "Agent"]));
    items = payoutGroups
      .map((row) =>
        card({
          id: row.agentId,
          title: names.get(row.agentId) || "Agent",
          subtitle: `${row._sum.amountPaise || 0} paise approved`,
          status: "APPROVED",
          createdAt: new Date()
        })
      )
      .sort((a, b) => b.subtitle.localeCompare(a.subtitle));
  } else {
    const listed = await takePage(async () => {
      if (segment === "agents") {
        const rows = await prisma.agentProfile.findMany({
          where: { status: "PENDING" },
          orderBy: { id: "desc" },
          ...cursorQuery(page.cursorId, page.limit),
          include: { user: { select: { name: true } } }
        });
        return rows.map((row) => ({
          id: row.id,
          title: row.user.name || "Agent",
          subtitle: `Depth ${row.depth}`,
          status: row.status,
          createdAt: row.createdAt
        }));
      }
      if (segment === "devices") {
        const rows = await prisma.adminDevice.findMany({
          where: { status: "PENDING" },
          orderBy: { id: "desc" },
          ...cursorQuery(page.cursorId, page.limit),
          include: { user: { select: { name: true, email: true } } }
        });
        return rows.map((row) => ({
          id: row.id,
          title: row.name,
          subtitle: row.user.name || row.user.email,
          status: row.status,
          createdAt: row.createdAt
        }));
      }
      if (segment === "proofs" || segment === "shop") {
        const rows = await prisma.shopOrder.findMany({
          where: segment === "proofs" ? { status: "PROOF_SENT" } : { status: { in: [...SHOP_QUEUE] } },
          orderBy: { id: "desc" },
          ...cursorQuery(page.cursorId, page.limit),
          select: { id: true, status: true, totalPaise: true, createdAt: true, invoiceNumber: true }
        });
        return rows.map((row) => ({
          id: row.id,
          title: row.invoiceNumber || row.id,
          subtitle: `${row.totalPaise} paise`,
          status: row.status,
          createdAt: row.createdAt
        }));
      }
      if (segment === "refunds" || segment === "support") {
        const rows = await prisma.supportTicket.findMany({
          where: segment === "refunds" ? refundWhere : { status: "OPEN" },
          orderBy: { id: "desc" },
          ...cursorQuery(page.cursorId, page.limit),
          select: { id: true, subject: true, status: true, createdAt: true }
        });
        return rows.map((row) => ({
          id: row.id,
          title: row.subject,
          subtitle: row.status,
          status: row.status,
          createdAt: row.createdAt
        }));
      }
      const rows = await prisma.payment.findMany({
        where: { OR: [{ status: "FAILED" }, { status: "PENDING", createdAt: { lt: stale } }] },
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit),
        select: { id: true, amount: true, status: true, createdAt: true }
      });
      return rows.map((row) => ({
        id: row.id,
        title: `${row.amount} paise`,
        subtitle: row.status,
        status: row.status,
        createdAt: row.createdAt
      }));
    }, page.limit);
    if (!listed.ok) return listed;
    items = listed.data.items.map(card);
    nextCursor = listed.data.nextCursor;
  }

  return ok({
    counts: {
      agents,
      devices,
      proofs,
      payouts: payoutGroups.length,
      refunds,
      shop,
      support,
      failed
    },
    segment,
    items,
    nextCursor
  });
}

async function advanceOrder(orderId: string, userId: string, deviceId?: string | null, ip?: string | null) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { lines: { select: { needsNfc: true } } }
  });
  if (!order || !isShopOrderStatus(order.status)) return fail(404, "Order not found");
  const ctx = {
    actor: "admin" as const,
    anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
    reprintApproved: false
  };
  const next = FORWARD.find((status) => !moveError(order.status, status as ShopOrderStatusName, ctx));
  if (!next) return fail(400, "That order cannot move forward");
  return moveShopOrder({ orderId, to: next, actor: "admin", userId, deviceId, ip });
}

export async function applyInboxAction(input: {
  segment: string;
  action: string;
  id?: string;
  ids?: string[];
  actorId: string;
  actorDeviceId?: string | null;
  ip?: string;
}) {
  const ids = [...new Set([...(input.ids || []), ...(input.id ? [input.id] : [])])].slice(0, 50);
  if (!ids.length) return fail(400, "Choose at least one item");
  if (input.segment === "payouts") return fail(400, "Mark a payout paid from Money");
  let changed = 0;
  for (const id of ids) {
    if (input.segment === "agents" && (input.action === "approve" || input.action === "reject")) {
      const result = await setAgentTeamStatus(id, input.action === "approve" ? "ACTIVE" : "REJECTED", input.actorId);
      if (result.ok) changed += 1;
      continue;
    }
    if (input.segment === "devices" && input.action === "approve") {
      const result = await setAdminDeviceStatus({
        deviceId: id,
        action: "approve",
        actorId: input.actorId,
        actorDeviceId: input.actorDeviceId,
        ip: input.ip
      });
      if (result.ok) changed += 1;
      continue;
    }
    if (input.segment === "devices" && input.action === "revoke") {
      const result = await setAdminDeviceStatus({
        deviceId: id,
        action: "revoke",
        actorId: input.actorId,
        actorDeviceId: input.actorDeviceId,
        ip: input.ip
      });
      if (result.ok) changed += 1;
      continue;
    }
    if (input.segment === "proofs" && input.action === "approve") {
      const result = await moveShopOrder({
        orderId: id,
        to: "APPROVED",
        actor: "admin",
        userId: input.actorId,
        deviceId: input.actorDeviceId,
        ip: input.ip
      });
      if (result.ok) changed += 1;
      continue;
    }
    if (input.segment === "shop" && input.action === "advance") {
      const result = await advanceOrder(id, input.actorId, input.actorDeviceId, input.ip);
      if (result.ok) changed += 1;
      continue;
    }
    if ((input.segment === "support" || input.segment === "refunds") && input.action === "close") {
      const result = await replyToTicket({ ticketId: id, authorId: input.actorId, status: "CLOSED" });
      if (result.ok) changed += 1;
      continue;
    }
    if (input.segment === "failed" && input.action === "reject") {
      const result = await rejectAdminPayment(id);
      if (result.ok) changed += 1;
    }
  }
  if (!changed) return fail(400, "Nothing could be updated");
  return ok({ changed });
}

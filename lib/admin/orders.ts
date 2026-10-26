import { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { isShopOrderStatus, type ShopOrderStatusName } from "@/lib/shop/order-status";
import { maskPhone } from "./mask";

export type AdminOrderSort = "createdAt" | "totalPaise" | "status" | "id";
export type AdminOrderQuery = {
  q: string;
  status: ShopOrderStatusName | "";
  page: number;
  pageSize: 20 | 50 | 100;
  sort: AdminOrderSort;
  dir: "asc" | "desc";
};

export function parseAdminOrderQuery(search: URLSearchParams) {
  const rawStatus = (search.get("status") || "").trim();
  if (rawStatus && !isShopOrderStatus(rawStatus)) return { ok: false as const, error: "Unknown order status" };

  const rawPage = search.get("page") || "1";
  if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 10000) {
    return { ok: false as const, error: "Page must be from 1 to 10000" };
  }
  const rawSize = search.get("pageSize") || "20";
  if (!new Set(["20", "50", "100"]).has(rawSize)) return { ok: false as const, error: "Page size must be 20, 50, or 100" };

  const rawSort = search.get("sort") || "createdAt";
  const sort: AdminOrderSort = ["createdAt", "totalPaise", "status", "id"].includes(rawSort) ? rawSort as AdminOrderSort : "createdAt";
  return {
    ok: true as const,
    data: {
      q: (search.get("q") || "").trim().slice(0, 120),
      status: rawStatus as ShopOrderStatusName | "",
      page: Number(rawPage),
      pageSize: Number(rawSize) as AdminOrderQuery["pageSize"],
      sort,
      dir: search.get("dir") === "asc" ? "asc" as const : "desc" as const
    }
  };
}

/** Shared filter for the order list and its CSV export. */
function adminOrderWhere(query: Pick<AdminOrderQuery, "q" | "status">): Prisma.ShopOrderWhereInput {
  return {
    ...(query.status ? { status: query.status } : { status: { not: "PENDING_PAYMENT" } }),
    ...(query.q
      ? {
          OR: [
            { id: { contains: query.q, mode: "insensitive" } },
            { invoiceNumber: { contains: query.q, mode: "insensitive" } },
            { buyerLegalName: { contains: query.q, mode: "insensitive" } },
            { business: { is: { name: { contains: query.q, mode: "insensitive" } } } },
            { user: { is: { name: { contains: query.q, mode: "insensitive" } } } },
            { user: { is: { email: { contains: query.q, mode: "insensitive" } } } }
          ]
        }
      : {})
  };
}

export async function listAdminOrderPipeline(search: URLSearchParams) {
  const parsed = parseAdminOrderQuery(search);
  if (!parsed.ok) return fail(400, parsed.error);
  const query = parsed.data;
  const where = adminOrderWhere(query);
  const orderBy = { [query.sort]: query.dir } as Prisma.ShopOrderOrderByWithRelationInput;
  const [total, rows] = await Promise.all([
    prisma.shopOrder.count({ where }),
    prisma.shopOrder.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        status: true,
        totalPaise: true,
        invoiceNumber: true,
        createdAt: true,
        buyerLegalName: true,
        business: { select: { name: true } },
        user: { select: { name: true, phone: true } },
        lines: { select: { id: true, name: true, qty: true, needsNfc: true, ships: true, proofUrl: true } },
        shipment: { select: { awb: true, courierName: true, provider: true, lastError: true } },
        reprintRequests: { where: { status: "PENDING" }, select: { id: true }, take: 1 }
      }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      status: row.status as ShopOrderStatusName,
      totalPaise: row.totalPaise,
      invoiceNumber: row.invoiceNumber,
      createdAt: row.createdAt.toISOString(),
      businessName: row.business?.name || row.buyerLegalName || "QR24x7",
      customerName: row.user.name || "Customer",
      phone: maskPhone(row.user.phone),
      anyLineNeedsNfc: row.lines.some((line) => line.needsNfc),
      ships: row.lines.some((line) => line.ships),
      awb: row.shipment?.awb || null,
      courierName: row.shipment?.courierName || null,
      lastError: row.shipment?.lastError || null,
      pendingReprint: row.reprintRequests.length > 0,
      lines: row.lines.map((line) => ({ id: line.id, name: line.name, qty: line.qty, hasProof: Boolean(line.proofUrl) }))
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    dir: query.dir
  });
}

export const ORDER_EXPORT_CAP = 5000;

/** Every order that matches the list filters, newest rows first by the list sort. Phones are masked. */
export async function exportAdminOrders(search: URLSearchParams) {
  const parsed = parseAdminOrderQuery(search);
  if (!parsed.ok) return fail(400, parsed.error);
  const query = parsed.data;
  const where = adminOrderWhere(query);
  const orderBy = { [query.sort]: query.dir } as Prisma.ShopOrderOrderByWithRelationInput;
  const [total, rows] = await Promise.all([
    prisma.shopOrder.count({ where }),
    prisma.shopOrder.findMany({
      where,
      orderBy,
      take: ORDER_EXPORT_CAP,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalPaise: true,
        invoiceNumber: true,
        createdAt: true,
        buyerLegalName: true,
        business: { select: { name: true } },
        user: { select: { name: true, phone: true, email: true } },
        lines: { select: { qty: true } },
        shipment: { select: { awb: true, courierName: true } }
      }
    })
  ]);
  return ok({
    filter: { q: query.q, status: query.status, sort: query.sort, dir: query.dir },
    items: rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      businessName: row.business?.name || row.buyerLegalName || "QR24x7",
      customerName: row.user.name || "",
      email: row.user.email,
      phone: maskPhone(row.user.phone),
      items: row.lines.reduce((sum, line) => sum + line.qty, 0),
      totalPaise: row.totalPaise,
      awb: row.shipment?.awb || "",
      courierName: row.shipment?.courierName || "",
      createdAt: row.createdAt.toISOString()
    })),
    total,
    truncated: total > rows.length
  });
}

export async function loadAdminOrderDetail(id: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      totalPaise: true,
      subtotalPaise: true,
      discountPaise: true,
      advancePaise: true,
      balancePaise: true,
      invoiceNumber: true,
      buyerLegalName: true,
      createdAt: true,
      addressJson: true,
      business: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
      lines: { select: { id: true, sku: true, name: true, qty: true, unitPaise: true, needsNfc: true, ships: true, proofUrl: true, changeComment: true } },
      shipment: { select: { awb: true, courierName: true, provider: true, lastError: true, updatedAt: true } },
      reprintRequests: { where: { status: "PENDING" }, select: { id: true, reason: true, note: true, createdAt: true }, take: 1 }
    }
  });
  if (!order) return fail(404, "Order not found");
  const audit = await prisma.auditLog.findMany({
    where: { entity: "ShopOrder", entityId: order.id, action: "shop.order.move" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, createdAt: true, metadata: true, userId: true }
  });
  return ok({
    id: order.id,
    status: order.status as ShopOrderStatusName,
    paymentStatus: order.paymentStatus,
    totalPaise: order.totalPaise,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    advancePaise: order.advancePaise,
    balancePaise: order.balancePaise,
    invoiceNumber: order.invoiceNumber,
    buyerLegalName: order.buyerLegalName,
    createdAt: order.createdAt.toISOString(),
    address: order.addressJson,
    business: order.business,
    customer: { id: order.user.id, name: order.user.name, email: order.user.email, phone: maskPhone(order.user.phone) },
    lines: order.lines.map((line) => ({ ...line, hasProof: Boolean(line.proofUrl), proofUrl: undefined })),
    shipment: order.shipment ? { ...order.shipment, updatedAt: order.shipment.updatedAt.toISOString() } : null,
    pendingReprint: order.reprintRequests[0] || null,
    timeline: audit.map((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        actorId: row.userId,
        from: typeof metadata.from === "string" ? metadata.from : "",
        to: typeof metadata.to === "string" ? metadata.to : "",
        comment: typeof metadata.comment === "string" ? metadata.comment : ""
      };
    })
  });
}

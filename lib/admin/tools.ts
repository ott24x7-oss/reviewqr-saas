import { Prisma, type QrStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function loadAdminQrStock(input: { status?: string; q?: string }) {
  const { status, q } = parseAdminQrStockQuery(input);
  const where: Prisma.QRCodeWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ shortCode: { contains: q, mode: "insensitive" } }, { label: { contains: q, mode: "insensitive" } }] } : {})
  };
  const [codes, businesses, unassigned] = await Promise.all([
    prisma.qRCode.findMany({
      where,
      include: { business: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100
    }),
    prisma.business.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
    prisma.qRCode.count({ where: { status: "UNASSIGNED" } })
  ]);
  return { status, q, codes, businesses, unassigned };
}

export function parseAdminQrStockQuery(input: { status?: string; q?: string }) {
  const status: QrStatus | "" = input.status === "UNASSIGNED" || input.status === "ACTIVE" || input.status === "DISABLED" ? input.status as QrStatus : "";
  return {
    status,
    q: (input.q || "").trim().slice(0, 120)
  };
}

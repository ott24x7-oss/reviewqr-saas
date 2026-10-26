import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { readOffset } from "./directory";

export async function listAdminAudit(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const admin = (search.get("admin") || "").trim();
  const action = (search.get("action") || "").trim();
  const target = (search.get("target") || "").trim();
  const listed = await takePage(
    () =>
      prisma.auditLog.findMany({
        where: {
          ...(admin ? { userId: admin } : {}),
          ...(action ? { action } : {}),
          ...(target ? { OR: [{ entity: target }, { entityId: target }] } : {})
        },
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  const ids = [...new Set(listed.data.items.map((row) => row.userId).filter((id): id is string => !!id))];
  const admins = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(admins.map((user) => [user.id, user.name || user.email]));
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      adminId: row.userId,
      adminName: row.userId ? names.get(row.userId) || "Admin" : null,
      deviceId: row.deviceId,
      ip: row.ip,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      reason: row.reason,
      before: row.before,
      after: row.after
    })),
    nextCursor: listed.data.nextCursor
  });
}

export async function listAdminAuditPage(search: URLSearchParams, mode: "page" | "export" = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const admin = (search.get("admin") || "").trim();
  const action = (search.get("action") || "").trim();
  const target = (search.get("target") || "").trim();
  const q = (search.get("q") || "").trim();
  const where = {
    AND: [
      ...(admin ? [{ userId: admin }] : []),
      ...(action ? [{ action }] : []),
      ...(target ? [{ OR: [{ entity: target }, { entityId: target }] }] : []),
      ...(q
        ? [
            {
              OR: [
                { action: { contains: q, mode: "insensitive" as const } },
                { entity: { contains: q, mode: "insensitive" as const } },
                { entityId: { contains: q } },
                { reason: { contains: q, mode: "insensitive" as const } }
              ]
            }
          ]
        : [])
    ]
  };
  const direction = search.get("dir") === "asc" ? "asc" : "desc";
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: direction },
      skip: page.data.skip,
      take: page.data.limit
    })
  ]);
  const ids = [...new Set(rows.map((row) => row.userId).filter((id): id is string => !!id))];
  const admins = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(admins.map((user) => [user.id, user.name || user.email]));
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      adminId: row.userId,
      adminName: row.userId ? names.get(row.userId) || "Admin" : null,
      deviceId: row.deviceId,
      ip: row.ip,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      reason: row.reason,
      before: row.before,
      after: row.after
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}

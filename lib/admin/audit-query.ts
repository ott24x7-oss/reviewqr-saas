import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";

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

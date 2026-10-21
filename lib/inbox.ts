import { prisma } from "./db";
import { cursorQuery, type PageQuery } from "./api/cursor";
import { takePage } from "./api/page";
import { ok } from "./api/result";

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  isRead: true,
  createdAt: true
} as const;

export async function listNotifications(userId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: notificationSelect
    }),
    prisma.notification.count({ where: { userId, isRead: false } })
  ]);
  return ok({ items, unread });
}

export async function listNotificationPage(userId: string, page: PageQuery) {
  const [paged, unread] = await Promise.all([
    takePage(
      () =>
        prisma.notification.findMany({
          where: { userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: notificationSelect,
          ...cursorQuery(page.cursorId, page.limit)
        }),
      page.limit
    ),
    prisma.notification.count({ where: { userId, isRead: false } })
  ]);
  if (!paged.ok) return paged;
  return ok({ items: paged.data.items, nextCursor: paged.data.nextCursor, unread });
}

export async function markNotificationsRead(userId: string, id?: string) {
  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true }
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
  return ok({ ok: true as const });
}

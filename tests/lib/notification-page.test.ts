import { afterAll, describe, expect, it } from "vitest";
import { decodeCursor } from "../../lib/api/cursor";
import { prisma } from "../../lib/db";
import { listNotificationPage, markNotificationsRead } from "../../lib/inbox";

describe("notification pages", () => {
  const created: string[] = [];

  afterAll(async () => {
    if (!created.length) return;
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("returns the next cursor and marks one row read", async () => {
    const user = await prisma.user.create({
      data: { email: `inbox-${Date.now()}@example.test`, role: "USER" }
    });
    created.push(user.id);
    const base = Date.now();
    const rows = await Promise.all(
      ["One", "Two", "Three"].map((title, index) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "test",
            title,
            message: title,
            createdAt: new Date(base + index * 1000)
          }
        })
      )
    );

    const first = await listNotificationPage(user.id, { limit: 2, cursorId: null });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.items).toHaveLength(2);
    expect(first.data.items[0]?.id).toBe(rows[2]?.id);
    expect(first.data.unread).toBe(3);
    expect(decodeCursor(first.data.nextCursor)).toBe(first.data.items[1]?.id);

    const second = await listNotificationPage(user.id, {
      limit: 2,
      cursorId: first.data.items[1]?.id || null
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.items.map((row) => row.id)).toEqual([rows[0]?.id]);
    expect(second.data.nextCursor).toBeNull();

    await markNotificationsRead(user.id, first.data.items[0]?.id);
    const after = await listNotificationPage(user.id, { limit: 20, cursorId: null });
    expect(after.ok && after.data.unread).toBe(2);
  });
});

import type { BusinessMemberRole } from "@prisma/client";
import { bookingStatusPatchSchema, bookingTimeLabel, type BookingStatus } from "@reviewqr/shared";
import { prisma } from "../db";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok } from "../api/result";
import { featureBlock } from "../plans/feature-gate";
import { accessRole, allows, readableBusinessWhere, requireBusinessRole } from "../tenant";
import { whatsAppNumberUrl } from "../tap/links";
import { istDayKey } from "../analytics/ist";

const cardSelect = {
  id: true,
  businessId: true,
  itemId: true,
  customerName: true,
  customerPhone: true,
  consentAt: true,
  preferredDate: true,
  preferredSlot: true,
  preferredTime: true,
  note: true,
  status: true,
  source: true,
  createdAt: true,
  business: { select: { name: true, ownerId: true, agentId: true, members: { select: { userId: true, role: true } } } },
  item: { select: { name: true, nameHi: true } },
  variant: { select: { label: true, labelHi: true } }
} as const;

type BookingRow = {
  id: string;
  businessId: string;
  itemId: string;
  customerName: string;
  customerPhone: string | null;
  consentAt: Date | null;
  preferredDate: string;
  preferredSlot: string | null;
  preferredTime: string | null;
  note: string | null;
  status: BookingStatus;
  source: string | null;
  createdAt: Date;
  business: {
    name: string;
    ownerId: string;
    agentId: string | null;
    members: { userId: string; role: BusinessMemberRole }[];
  };
  item: { name: string; nameHi: string | null };
  variant: { label: string; labelHi: string | null } | null;
};

function toCard(row: BookingRow, userId: string) {
  const role = accessRole(
    row.business.ownerId,
    userId,
    row.business.members.find((member) => member.userId === userId)?.role,
    row.business.agentId
  );
  const phone = row.consentAt && row.customerPhone ? row.customerPhone : null;
  const option = row.variant?.label || "";
  const time = bookingTimeLabel(row.preferredSlot, row.preferredTime, "en");
  const wa = phone ? whatsAppNumberUrl(phone) : null;
  return {
    id: row.id,
    businessId: row.businessId,
    businessName: row.business.name,
    itemId: row.itemId,
    serviceName: row.item.name,
    optionLabel: option,
    customerName: row.customerName,
    phone,
    preferredDate: row.preferredDate,
    preferredSlot: row.preferredSlot,
    preferredTime: row.preferredTime,
    timeLabel: time,
    note: row.note || "",
    status: row.status,
    source: row.source,
    canManage: allows(role, "manage"),
    callUrl: phone ? `tel:+${phone}` : null,
    whatsAppUrl: wa,
    createdAt: row.createdAt.toISOString()
  };
}

async function guardRead(userId: string, businessId: string | null) {
  if (!businessId) {
    const rows = await prisma.business.findMany({
      where: readableBusinessWhere(userId),
      select: { ownerId: true },
      take: 20
    });
    if (!rows.length) return fail(404, "Not found");
    for (const row of rows) {
      const locked = await featureBlock(row.ownerId, "services-booking");
      if (!locked) return null;
    }
    return await featureBlock(rows[0].ownerId, "services-booking");
  }
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const locked = await featureBlock(access.ownerId, "services-booking");
  if (locked) return locked;
  return null;
}

export async function listBookings(
  userId: string,
  page: PageQuery,
  query: { businessId?: string | null; status?: string | null; date?: string | null; today?: boolean }
) {
  const blocked = await guardRead(userId, query.businessId || null);
  if (blocked) return blocked;
  const status = query.status && ["NEW", "CONFIRMED", "DONE", "CANCELLED", "NO_SHOW"].includes(query.status)
    ? (query.status as BookingStatus)
    : undefined;
  const date = query.today ? istDayKey(new Date()) : query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : undefined;
  const where = {
    business: query.businessId ? { id: query.businessId } : readableBusinessWhere(userId),
    ...(status ? { status } : {}),
    ...(date ? { preferredDate: date } : {})
  };
  const rows = await takePage(
    () =>
      prisma.bookingRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: cardSelect,
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
  if (!rows.ok) return rows;
  return ok({
    items: (rows.data.items as BookingRow[]).map((row) => toCard(row, userId)),
    nextCursor: rows.data.nextCursor
  });
}

export async function loadBooking(userId: string, id: string) {
  const row = await prisma.bookingRequest.findUnique({ where: { id }, select: cardSelect });
  if (!row) return fail(404, "Not found");
  const access = await requireBusinessRole(userId, row.businessId, "read");
  if (!access) return fail(404, "Not found");
  const locked = await featureBlock(access.ownerId, "services-booking");
  if (locked) return locked;
  return ok(toCard(row as BookingRow, userId));
}

export async function setBookingStatus(userId: string, id: string, raw: unknown) {
  const parsed = bookingStatusPatchSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid status");
  const row = await prisma.bookingRequest.findUnique({ where: { id }, select: { id: true, businessId: true } });
  if (!row) return fail(404, "Not found");
  const access = await requireBusinessRole(userId, row.businessId, "manage");
  if (!access) return fail(404, "Not found");
  const locked = await featureBlock(access.ownerId, "services-booking");
  if (locked) return locked;
  await prisma.bookingRequest.update({ where: { id: row.id }, data: { status: parsed.data.status } });
  return loadBooking(userId, row.id);
}

export async function countBookingsToday(businessIds: string[], now = new Date()) {
  if (!businessIds.length) return { count: 0, items: [] as ReturnType<typeof toCard>[] };
  const date = istDayKey(now);
  const [count, rows] = await Promise.all([
    prisma.bookingRequest.count({
      where: { businessId: { in: businessIds }, preferredDate: date, status: { not: "CANCELLED" } }
    }),
    prisma.bookingRequest.findMany({
      where: { businessId: { in: businessIds }, preferredDate: date, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: cardSelect
    })
  ]);
  return {
    count,
    items: (rows as BookingRow[]).map((row) => toCard(row, ""))
  };
}

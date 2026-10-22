import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { foldDay, type DailyFold } from "./fold";
import { addIstDays, istDayKey, istDayRange, istDaysEnding } from "./ist";

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) out[key] = Number(item) || 0;
  return out;
}

function asArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toStoredDay(row: {
  day: Date;
  scans: number;
  tapsNfc: number;
  tapsQr: number;
  pageViews: number;
  buttonClicks: Prisma.JsonValue;
  menuViews: number;
  topItems: Prisma.JsonValue;
  orderCount: number;
  orderPaise: number;
  feedbackCount: number;
  ratingSum: number;
  ratingCount: number;
  ratings: Prisma.JsonValue;
  hours: Prisma.JsonValue;
  byQr: Prisma.JsonValue;
  byStaff: Prisma.JsonValue;
  byDevice: Prisma.JsonValue;
  byTable: Prisma.JsonValue;
}) {
  const key = row.day.toISOString().slice(0, 10);
  return {
    day: key,
    scans: row.scans,
    tapsNfc: row.tapsNfc,
    tapsQr: row.tapsQr,
    pageViews: row.pageViews,
    buttonClicks: asRecord(row.buttonClicks),
    menuViews: row.menuViews,
    topItems: asArray<{ itemId: string; name: string; views: number }>(row.topItems),
    orderCount: row.orderCount,
    orderPaise: row.orderPaise,
    feedbackCount: row.feedbackCount,
    ratingSum: row.ratingSum,
    ratingCount: row.ratingCount,
    ratings: asRecord(row.ratings),
    hours: asArray<number>(row.hours).map((n) => Number(n) || 0),
    byQr: asArray<{ qrId: string; label: string; scans: number; nfc: number; qr: number }>(row.byQr),
    byStaff: asArray<{ staffId: string; name: string; scans: number; feedback: number }>(row.byStaff),
    byDevice: {
      mobile: Number(asRecord(row.byDevice).mobile) || 0,
      tablet: Number(asRecord(row.byDevice).tablet) || 0,
      desktop: Number(asRecord(row.byDevice).desktop) || 0,
      other: Number(asRecord(row.byDevice).other) || 0
    },
    byTable: asArray<{ table: string; scans: number; orders: number }>(row.byTable)
  };
}

export async function rollupBusinessDay(businessId: string, dayKey: string) {
  const { start, end } = istDayRange(dayKey);
  const [qrs, devices] = await Promise.all([
    prisma.qRCode.findMany({
      where: { businessId },
      select: { id: true, label: true, shortCode: true, type: true, staffId: true, staff: { select: { name: true } } }
    }),
    prisma.device.findMany({
      where: { businessId, tableLabel: { not: null } },
      select: { shortCode: true, tableLabel: true }
    })
  ]);
  const tableByCode = new Map(
    devices.flatMap((device) => (device.tableLabel ? [[device.shortCode, device.tableLabel] as const] : []))
  );
  const qrIds = qrs.map((qr) => qr.id);
  const [scans, taps, items, orders, reviews, feedbackCount] = await Promise.all([
    qrIds.length
      ? prisma.qrScan.findMany({
          where: { qrCodeId: { in: qrIds }, createdAt: { gte: start, lt: end } },
          select: { qrCodeId: true, source: true, deviceType: true, createdAt: true }
        })
      : Promise.resolve([]),
    prisma.tapEvent.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { type: true, linkKey: true, source: true, qrCodeId: true, createdAt: true }
    }),
    prisma.menuItemView.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { itemId: true, item: { select: { name: true } } }
    }),
    prisma.menuOrder.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { totalPaise: true, tableOrAddress: true, orderType: true, qrCodeId: true }
    }),
    prisma.review.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { rating: true, staffId: true }
    }),
    prisma.feedback.count({ where: { businessId, createdAt: { gte: start, lt: end } } })
  ]);

  const folded: DailyFold = foldDay({
    scans,
    taps,
    items: items.map((row) => ({ itemId: row.itemId, name: row.item.name })),
    reviews,
    feedbackCount,
    orders: orders.map((order) => {
      const qr = qrs.find((row) => row.id === order.qrCodeId);
      const fromDevice = qr ? tableByCode.get(qr.shortCode) : "";
      const fromTableQr = qr?.type === "TABLE" ? qr.label : "";
      const dine = order.orderType === "DINE_IN" ? (order.tableOrAddress || "").trim() : "";
      return { totalPaise: order.totalPaise, table: dine || fromDevice || fromTableQr || null };
    }),
    qrs: qrs.map((qr) => ({
      id: qr.id,
      label: qr.label,
      staffId: qr.staffId,
      staffName: qr.staff?.name || null,
      table: tableByCode.get(qr.shortCode) || (qr.type === "TABLE" ? qr.label : null)
    }))
  });

  const day = new Date(`${dayKey}T00:00:00.000Z`);
  await prisma.analyticsDaily.upsert({
    where: { businessId_day: { businessId, day } },
    create: { businessId, day, ...folded },
    update: folded
  });
  return folded;
}

export async function rollupBusinessRange(businessId: string, fromKey: string, toKey: string) {
  let cursor = fromKey;
  let guard = 0;
  while (cursor <= toKey && guard < 400) {
    await rollupBusinessDay(businessId, cursor);
    cursor = addIstDays(cursor, 1);
    guard += 1;
  }
}

export async function rollupAllBusinesses(dayKey: string) {
  const businesses = await prisma.business.findMany({
    where: { archived: false },
    select: { id: true }
  });
  for (const business of businesses) {
    await rollupBusinessDay(business.id, dayKey);
  }
  return businesses.length;
}

/** Missing days, plus yesterday, which may have received events after its first rollup. */
export function daysNeedingRollup(wanted: string[], existing: string[], yesterday: string) {
  const have = new Set(existing);
  return wanted.filter((day) => day === yesterday || !have.has(day));
}

/** Today, and at IST midnight also the day that just closed. */
export function rollupJobDays(today: string, hour: number) {
  if (hour !== 0) return [today];
  return [today, addIstDays(today, -1)];
}

/** Fill any missing IST days in the window, then return the stored rows in order. */
export async function ensureRollups(businessId: string, fromKey: string, toKey: string, now = new Date()) {
  const wanted = istDaysEnding(toKey, daysBetween(fromKey, toKey));
  const yesterday = addIstDays(istDayKey(now), -1);
  const existing = await prisma.analyticsDaily.findMany({
    where: { businessId, day: { gte: new Date(`${fromKey}T00:00:00.000Z`), lte: new Date(`${toKey}T00:00:00.000Z`) } },
    select: { day: true }
  });
  const have = existing.map((row) => row.day.toISOString().slice(0, 10));
  for (const day of daysNeedingRollup(wanted, have, yesterday)) {
    await rollupBusinessDay(businessId, day);
  }
  const rows = await prisma.analyticsDaily.findMany({
    where: { businessId, day: { gte: new Date(`${fromKey}T00:00:00.000Z`), lte: new Date(`${toKey}T00:00:00.000Z`) } },
    orderBy: { day: "asc" }
  });
  return rows.map(toStoredDay);
}

function daysBetween(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00.000Z`).getTime();
  const to = new Date(`${toKey}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round((to - from) / 86400000) + 1);
}

export async function backfillRollups(days = 90, now = new Date()) {
  const end = istDayKey(now);
  const start = addIstDays(end, -(Math.max(1, days) - 1));
  const businesses = await prisma.business.findMany({ where: { archived: false }, select: { id: true } });
  for (const business of businesses) {
    await rollupBusinessRange(business.id, start, end);
  }
  return { businesses: businesses.length, from: start, to: end };
}

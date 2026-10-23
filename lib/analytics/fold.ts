import { istHour, istWeekdayIndex } from "./ist";

export type ScanRow = {
  qrCodeId: string;
  source: string | null;
  createdAt: Date;
  deviceType?: string | null;
};
export type TapRow = {
  type: string;
  linkKey: string | null;
  source: string | null;
  qrCodeId: string | null;
  createdAt: Date;
};
export type ItemViewRow = { itemId: string; name: string };
export type OrderRow = { totalPaise: number; table?: string | null };
export type ReviewRow = { rating: number; staffId: string | null };
export type QrMeta = {
  id: string;
  label: string;
  staffId: string | null;
  staffName: string | null;
  table?: string | null;
};

export type DeviceCounts = { mobile: number; tablet: number; desktop: number; other: number };
export type TableStat = { table: string; scans: number; orders: number };

export function emptyDevices(): DeviceCounts {
  return { mobile: 0, tablet: 0, desktop: 0, other: 0 };
}

export function deviceBucket(value: string | null | undefined): keyof DeviceCounts {
  const name = (value || "").toLowerCase();
  if (name === "mobile" || name === "tablet" || name === "desktop") return name;
  return "other";
}

export type DailyFold = {
  scans: number;
  tapsNfc: number;
  tapsQr: number;
  pageViews: number;
  buttonClicks: Record<string, number>;
  menuViews: number;
  topItems: Array<{ itemId: string; name: string; views: number }>;
  orderCount: number;
  orderPaise: number;
  feedbackCount: number;
  ratingSum: number;
  ratingCount: number;
  ratings: Record<string, number>;
  hours: number[];
  byQr: Array<{ qrId: string; label: string; scans: number; nfc: number; qr: number }>;
  byStaff: Array<{ staffId: string; name: string; scans: number; feedback: number }>;
  byDevice: DeviceCounts;
  byTable: TableStat[];
};

export function isNfcSource(source: string | null | undefined) {
  return source === "nfc";
}

export function isQrSource(source: string | null | undefined) {
  return !source || source === "qr";
}

function emptyRatings() {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

export function foldDay(input: {
  scans: ScanRow[];
  taps: TapRow[];
  items: ItemViewRow[];
  orders: OrderRow[];
  reviews: ReviewRow[];
  feedbackCount: number;
  qrs: QrMeta[];
}): DailyFold {
  const clicks: Record<string, number> = {};
  const itemCounts = new Map<string, { name: string; views: number }>();
  const hours = Array.from({ length: 24 }, () => 0);
  const devices = emptyDevices();
  const tables = new Map<string, { scans: number; orders: number }>();
  const qrCounts = new Map<string, { scans: number; nfc: number; qr: number }>();
  const staffCounts = new Map<string, { name: string; scans: number; feedback: number }>();
  const qrById = new Map(input.qrs.map((qr) => [qr.id, qr]));

  let tapsNfc = 0;
  let tapsQr = 0;
  for (const scan of input.scans) {
    if (isNfcSource(scan.source)) tapsNfc += 1;
    else if (isQrSource(scan.source)) tapsQr += 1;
    const hour = istHour(scan.createdAt);
    if (hour >= 0 && hour < 24) hours[hour] += 1;
    devices[deviceBucket(scan.deviceType)] += 1;
    const bucket = qrCounts.get(scan.qrCodeId) || { scans: 0, nfc: 0, qr: 0 };
    bucket.scans += 1;
    if (isNfcSource(scan.source)) bucket.nfc += 1;
    if (isQrSource(scan.source)) bucket.qr += 1;
    qrCounts.set(scan.qrCodeId, bucket);
    const meta = qrById.get(scan.qrCodeId);
    if (meta?.staffId) {
      const staff = staffCounts.get(meta.staffId) || { name: meta.staffName || "Staff", scans: 0, feedback: 0 };
      staff.scans += 1;
      staffCounts.set(meta.staffId, staff);
    }
    if (meta?.table) {
      const table = tables.get(meta.table) || { scans: 0, orders: 0 };
      table.scans += 1;
      tables.set(meta.table, table);
    }
  }

  let pageViews = 0;
  for (const tap of input.taps) {
    if (tap.type === "view") pageViews += 1;
    if (tap.type === "click") {
      const key = (tap.linkKey || "button").slice(0, 40);
      clicks[key] = (clicks[key] || 0) + 1;
    }
  }

  for (const item of input.items) {
    const current = itemCounts.get(item.itemId) || { name: item.name || "Item", views: 0 };
    current.views += 1;
    if (item.name) current.name = item.name;
    itemCounts.set(item.itemId, current);
  }

  const ratings = emptyRatings();
  let ratingSum = 0;
  let ratingCount = 0;
  for (const review of input.reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    ratings[String(rating) as "1" | "2" | "3" | "4" | "5"] += 1;
    ratingSum += rating;
    ratingCount += 1;
    if (review.staffId) {
      const staff = staffCounts.get(review.staffId) || { name: "Staff", scans: 0, feedback: 0 };
      staff.feedback += 1;
      staffCounts.set(review.staffId, staff);
    }
  }

  const topItems = [...itemCounts.entries()]
    .map(([itemId, row]) => ({ itemId, name: row.name, views: row.views }))
    .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name))
    .slice(0, 10);

  const byQr = [...qrCounts.entries()]
    .map(([qrId, row]) => ({ qrId, label: qrById.get(qrId)?.label || "QR", ...row }))
    .sort((a, b) => b.scans - a.scans);

  const byStaff = [...staffCounts.entries()]
    .map(([staffId, row]) => ({ staffId, ...row }))
    .sort((a, b) => b.scans + b.feedback - (a.scans + a.feedback));

  const orderPaise = input.orders.reduce((sum, order) => sum + Math.max(0, order.totalPaise || 0), 0);
  for (const order of input.orders) {
    const tableName = (order.table || "").trim();
    if (!tableName) continue;
    const table = tables.get(tableName) || { scans: 0, orders: 0 };
    table.orders += 1;
    tables.set(tableName, table);
  }
  const byTable = [...tables.entries()]
    .map(([table, row]) => ({ table, ...row }))
    .sort((a, b) => b.scans + b.orders - (a.scans + a.orders) || a.table.localeCompare(b.table));

  return {
    scans: input.scans.length,
    tapsNfc,
    tapsQr,
    pageViews,
    buttonClicks: clicks,
    menuViews: input.items.length,
    topItems,
    orderCount: input.orders.length,
    orderPaise,
    feedbackCount: input.feedbackCount,
    ratingSum,
    ratingCount,
    ratings,
    hours,
    byQr,
    byStaff,
    byDevice: devices,
    byTable
  };
}

export type StoredDay = {
  day: string;
  scans: number;
  tapsNfc: number;
  tapsQr: number;
  pageViews: number;
  buttonClicks: Record<string, number>;
  menuViews: number;
  topItems: Array<{ itemId: string; name: string; views: number }>;
  orderCount: number;
  orderPaise: number;
  feedbackCount: number;
  ratingSum: number;
  ratingCount: number;
  ratings: Record<string, number>;
  hours: number[];
  byQr: DailyFold["byQr"];
  byStaff: DailyFold["byStaff"];
  byDevice: DeviceCounts;
  byTable: TableStat[];
};

/** Previous period is the same length immediately before `from`. Null when there is nothing to compare. */
export function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function foldRange(days: StoredDay[]) {
  const buttonClicks: Record<string, number> = {};
  const items = new Map<string, { name: string; views: number }>();
  const hoursByDay = [0, 1, 2, 3, 4, 5, 6].map(() => Array.from({ length: 24 }, () => 0));
  const qr = new Map<string, { label: string; scans: number; nfc: number; qr: number }>();
  const staff = new Map<string, { name: string; scans: number; feedback: number }>();
  const byDevice = emptyDevices();
  const tables = new Map<string, { scans: number; orders: number }>();
  const totals = {
    scans: 0,
    tapsNfc: 0,
    tapsQr: 0,
    pageViews: 0,
    menuViews: 0,
    orderCount: 0,
    orderPaise: 0,
    feedbackCount: 0,
    ratingSum: 0,
    ratingCount: 0,
    ratings: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as Record<string, number>
  };
  const trend: Array<{ day: string; scans: number; pageViews: number; orders: number }> = [];

  for (const day of days) {
    totals.scans += day.scans;
    totals.tapsNfc += day.tapsNfc;
    totals.tapsQr += day.tapsQr;
    totals.pageViews += day.pageViews;
    totals.menuViews += day.menuViews;
    totals.orderCount += day.orderCount;
    totals.orderPaise += day.orderPaise;
    totals.feedbackCount += day.feedbackCount;
    totals.ratingSum += day.ratingSum;
    totals.ratingCount += day.ratingCount;
    for (const star of ["1", "2", "3", "4", "5"]) totals.ratings[star] += Number(day.ratings?.[star] || 0);
    for (const [key, count] of Object.entries(day.buttonClicks || {})) {
      buttonClicks[key] = (buttonClicks[key] || 0) + count;
    }
    for (const item of day.topItems || []) {
      const current = items.get(item.itemId) || { name: item.name, views: 0 };
      current.views += item.views;
      current.name = item.name || current.name;
      items.set(item.itemId, current);
    }
    const weekday = istWeekdayIndex(day.day);
    const hours = Array.isArray(day.hours) ? day.hours : [];
    for (let hour = 0; hour < 24; hour += 1) hoursByDay[weekday][hour] += Number(hours[hour] || 0);
    for (const row of day.byQr || []) {
      const current = qr.get(row.qrId) || { label: row.label, scans: 0, nfc: 0, qr: 0 };
      current.scans += row.scans;
      current.nfc += row.nfc;
      current.qr += row.qr;
      current.label = row.label || current.label;
      qr.set(row.qrId, current);
    }
    for (const row of day.byStaff || []) {
      const current = staff.get(row.staffId) || { name: row.name, scans: 0, feedback: 0 };
      current.scans += row.scans;
      current.feedback += row.feedback;
      current.name = row.name || current.name;
      staff.set(row.staffId, current);
    }
    const device = day.byDevice || emptyDevices();
    byDevice.mobile += Number(device.mobile) || 0;
    byDevice.tablet += Number(device.tablet) || 0;
    byDevice.desktop += Number(device.desktop) || 0;
    byDevice.other += Number(device.other) || 0;
    for (const row of day.byTable || []) {
      const current = tables.get(row.table) || { scans: 0, orders: 0 };
      current.scans += row.scans;
      current.orders += row.orders;
      tables.set(row.table, current);
    }
    trend.push({ day: day.day, scans: day.scans, pageViews: day.pageViews, orders: day.orderCount });
  }

  return {
    ...totals,
    avgRating: totals.ratingCount ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10 : null,
    buttonClicks,
    topItems: [...items.entries()]
      .map(([itemId, row]) => ({ itemId, name: row.name, views: row.views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
    heatmap: hoursByDay,
    byQr: [...qr.entries()].map(([qrId, row]) => ({ qrId, ...row })).sort((a, b) => b.scans - a.scans),
    byStaff: [...staff.entries()]
      .map(([staffId, row]) => ({ staffId, ...row }))
      .sort((a, b) => b.scans + b.feedback - (a.scans + a.feedback)),
    byDevice,
    byTable: [...tables.entries()]
      .map(([table, row]) => ({ table, ...row }))
      .sort((a, b) => b.scans + b.orders - (a.scans + a.orders)),
    trend
  };
}

export function compareSummaries(
  current: ReturnType<typeof foldRange>,
  previous: ReturnType<typeof foldRange>
) {
  return {
    scans: percentChange(current.scans, previous.scans),
    taps: percentChange(current.tapsNfc + current.tapsQr, previous.tapsNfc + previous.tapsQr),
    pageViews: percentChange(current.pageViews, previous.pageViews),
    buttonClicks: percentChange(
      Object.values(current.buttonClicks).reduce((sum, n) => sum + n, 0),
      Object.values(previous.buttonClicks).reduce((sum, n) => sum + n, 0)
    ),
    orders: percentChange(current.orderCount, previous.orderCount),
    orderPaise: percentChange(current.orderPaise, previous.orderPaise),
    feedback: percentChange(current.feedbackCount, previous.feedbackCount),
    avgRating:
      current.avgRating != null && previous.avgRating != null
        ? Math.round((current.avgRating - previous.avgRating) * 10) / 10
        : null
  };
}

import { prisma } from "../db";
import { sendEmail } from "../email";
import { enqueueJob } from "../jobs/store";
import { absoluteUrl } from "../utils";
import { sendWhatsAppReport } from "../whatsapp";
import { ensureRollups } from "../analytics/build";
import { foldRange } from "../analytics/fold";
import { addIstDays } from "../analytics/ist";
import { hasModule } from "../plans/entitlements";
import { buildMonthlyPdf } from "./pdf";
import { getInsightSettings } from "./settings";
import { sendSlots, wantsReport } from "./schedule";
import { reportToken } from "./token";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function weeklyText(input: {
  name: string;
  scans: number;
  taps: number;
  pageViews: number;
  orders: number | null;
  orderPaise: number | null;
  feedback: number;
  avgRating: number | null;
  unsubscribeUrl: string;
}) {
  const orders =
    input.orders == null
      ? "WhatsApp orders: not on this plan"
      : `WhatsApp orders: ${input.orders} (Rs ${Math.round((input.orderPaise || 0) / 100)})`;
  const rating = input.avgRating == null ? "—" : String(input.avgRating);
  return [
    `ReviewQR weekly summary — ${input.name}`,
    `साप्ताहिक सारांश — ${input.name}`,
    `Scans / स्कैन: ${input.scans}`,
    `Taps / टैप: ${input.taps}`,
    `Page views / पेज: ${input.pageViews}`,
    orders,
    `Feedback / फ़ीडबैक: ${input.feedback}`,
    `Average rating / औसत रेटिंग: ${rating}`,
    `Unsubscribe / बंद करें: ${input.unsubscribeUrl}`
  ].join("\n");
}

async function folded(businessId: string, from: string, to: string) {
  return foldRange(await ensureRollups(businessId, from, to));
}

export async function enqueueWeeklySends(weekKey: string, now = new Date()) {
  const settings = await getInsightSettings();
  const owners = await prisma.user.findMany({
    where: { deletedAt: null, businesses: { some: { archived: false } } },
    select: { id: true, reportPreference: true }
  });
  const due = owners.filter(
    (owner) => wantsReport(owner.reportPreference, "email") || wantsReport(owner.reportPreference, "whatsapp")
  );
  const slots = sendSlots(due, settings.reportMaxPerMinute, now);
  for (const slot of slots) {
    await enqueueJob({
      type: "reports.weekly.send",
      payload: { userId: slot.item.id, weekKey },
      idempotencyKey: `reports.weekly.send:${slot.item.id}:${weekKey}`,
      runAt: slot.runAt
    });
  }
  return { owners: slots.length, maxPerMinute: settings.reportMaxPerMinute };
}

export async function sendWeeklyToUser(userId: string, weekKey: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      deletedAt: true,
      reportPreference: true,
      businesses: { where: { archived: false }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!user || user.deletedAt || user.businesses.length === 0) return { skipped: true as const };
  const emailOn = wantsReport(user.reportPreference, "email");
  const whatsappOn = wantsReport(user.reportPreference, "whatsapp");
  if (!emailOn && !whatsappOn) return { skipped: true as const };
  const end = addIstDays(weekKey, -1);
  const start = addIstDays(end, -6);
  let scans = 0;
  let taps = 0;
  let pageViews = 0;
  let orders = 0;
  let orderPaise = 0;
  let feedback = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let store = false;
  for (const business of user.businesses) {
    const summary = await folded(business.id, start, end);
    const storeOn = await hasModule(user.id, "STORE");
    store = store || storeOn;
    scans += summary.scans;
    taps += summary.tapsNfc + summary.tapsQr;
    pageViews += summary.pageViews;
    feedback += summary.feedbackCount;
    ratingSum += summary.ratingSum;
    ratingCount += summary.ratingCount;
    if (storeOn) {
      orders += summary.orderCount;
      orderPaise += summary.orderPaise;
    }
  }
  const text = weeklyText({
    name: user.businesses[0]?.name || user.name || "your business",
    scans,
    taps,
    pageViews,
    orders: store ? orders : null,
    orderPaise: store ? orderPaise : null,
    feedback,
    avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    unsubscribeUrl: absoluteUrl(`/api/reports/unsubscribe?token=${encodeURIComponent(reportToken(user.id))}`)
  });
  let whatsapp: "sent" | "failed" | "skipped" = "skipped";
  if (whatsappOn && user.phone) {
    const sent = await sendWhatsAppReport({ to: user.phone, message: text });
    whatsapp = sent.ok ? "sent" : "failed";
  }
  const emailFallback = whatsappOn && whatsapp !== "sent";
  if ((emailOn || emailFallback) && user.email) {
    await sendEmail({
      to: user.email,
      subject: `ReviewQR week of ${weekKey}`,
      text,
      html: `<pre style="font-family:sans-serif">${escapeHtml(text)}</pre>`
    });
  }
  return { skipped: false as const, whatsapp };
}

export async function monthlyPdfFor(businessId: string, monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month < 1 || month > 12) return null;
  const from = `${monthKey}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = addIstDays(next, -1);
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, ownerId: true, archived: true }
  });
  if (!business || business.archived) return null;
  const [summary, storeOn] = await Promise.all([folded(business.id, from, to), hasModule(business.ownerId, "STORE")]);
  const pdf = await buildMonthlyPdf({
    businessName: business.name,
    monthLabel: `Monthly report ${monthKey}`,
    rows: [
      { label: "Scans", value: String(summary.scans) },
      { label: "NFC taps", value: String(summary.tapsNfc) },
      { label: "QR taps", value: String(summary.tapsQr) },
      { label: "Page views", value: String(summary.pageViews) },
      { label: "WhatsApp orders", value: storeOn ? String(summary.orderCount) : "not included" },
      { label: "Order value INR", value: storeOn ? String(Math.round(summary.orderPaise / 100)) : "not included" },
      { label: "Feedback", value: String(summary.feedbackCount) },
      { label: "Average rating", value: summary.avgRating == null ? "-" : String(summary.avgRating) }
    ]
  });
  return { pdf, filename: `reviewqr-${monthKey}.pdf`, businessName: business.name };
}

export async function enqueueMonthlySends(monthKey: string, now = new Date()) {
  const settings = await getInsightSettings();
  const owners = await prisma.user.findMany({
    where: { deletedAt: null, businesses: { some: { archived: false } } },
    select: { id: true, reportPreference: true }
  });
  const due = owners.filter((owner) => wantsReport(owner.reportPreference, "email"));
  const slots = sendSlots(due, settings.reportMaxPerMinute, now);
  for (const slot of slots) {
    await enqueueJob({
      type: "reports.monthly.send",
      payload: { userId: slot.item.id, monthKey },
      idempotencyKey: `reports.monthly.send:${slot.item.id}:${monthKey}`,
      runAt: slot.runAt
    });
  }
  return { owners: slots.length };
}

export async function sendMonthlyToUser(userId: string, monthKey: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      deletedAt: true,
      reportPreference: true,
      businesses: { where: { archived: false }, select: { id: true, name: true }, orderBy: { createdAt: "asc" }, take: 1 }
    }
  });
  const business = user?.businesses[0];
  if (!user || user.deletedAt || !business || !user.email) return { skipped: true as const };
  if (!wantsReport(user.reportPreference, "email")) return { skipped: true as const };
  const report = await monthlyPdfFor(business.id, monthKey);
  if (!report) return { skipped: true as const };
  const unsubscribeUrl = absoluteUrl(`/api/reports/unsubscribe?token=${encodeURIComponent(reportToken(user.id))}`);
  const text = `Monthly report for ${report.businessName} (${monthKey}) is attached.\nUnsubscribe: ${unsubscribeUrl}`;
  await sendEmail({
    to: user.email,
    subject: `ReviewQR ${monthKey} report`,
    text,
    html: `<p>${escapeHtml(text).replace("\n", "<br>")}</p>`,
    attachments: [{ filename: report.filename, content: report.pdf, contentType: "application/pdf" }]
  });
  return { skipped: false as const };
}

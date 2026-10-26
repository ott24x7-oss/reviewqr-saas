import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { deadPushTokens, expoMessages, type ExpoMessage, type ExpoTicket } from "@/lib/push";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type AdminPushEvent =
  | "paidPayment"
  | "failedPayment"
  | "signup"
  | "agentPending"
  | "printProof"
  | "payoutDue"
  | "supportTicket"
  | "whatsappDown";

type PushInput = {
  event: AdminPushEvent;
  collapseKey: string;
  title: string;
  body: string;
  /** How long the same event stays collapsed. Pending payments use 30 minutes. Payouts use a day. */
  windowSeconds?: number;
  fetchImpl?: typeof fetch;
};

/** One collapsed alert to active admin phones. Owner push tokens are never used. */
export async function queueAdminPush(input: PushInput) {
  try {
    const collapse = await rateLimitDb({
      key: `admin-push:${input.event}:${input.collapseKey}`.slice(0, 180),
      limit: 1,
      windowSeconds: input.windowSeconds ?? 60
    });
    if (!collapse.ok) return;
    const devices = await prisma.adminDevice.findMany({
      where: {
        status: "ACTIVE",
        pushToken: { not: null },
        user: { role: "ADMIN", deletedAt: null, suspendedAt: null }
      },
      select: { userId: true, pushToken: true }
    });
    const byUser = new Map<string, string[]>();
    for (const device of devices) {
      if (!device.pushToken) continue;
      const list = byUser.get(device.userId) || [];
      list.push(device.pushToken);
      byUser.set(device.userId, list);
    }
    if (!byUser.size) return;
    const prefs = await prisma.adminNotifyPref.findMany({
      where: { userId: { in: [...byUser.keys()] } },
      select: {
        userId: true,
        paidPayment: true,
        failedPayment: true,
        signup: true,
        agentPending: true,
        printProof: true,
        payoutDue: true,
        supportTicket: true,
        whatsappDown: true
      }
    });
    const prefByUser = new Map(prefs.map((row) => [row.userId, row]));
    const tokens: string[] = [];
    for (const [userId, deviceTokens] of byUser) {
      const pref = prefByUser.get(userId);
      if (pref && pref[input.event] === false) continue;
      const cap = await rateLimitDb({
        key: `admin-push-user:${userId}:${input.event}`,
        limit: 8,
        windowSeconds: 3600
      });
      if (!cap.ok) continue;
      tokens.push(...deviceTokens);
    }
    const messages = expoMessages(tokens, {
      title: input.title,
      body: input.body,
      data: { event: input.event, key: input.collapseKey }
    });
    if (!messages.length) return;
    await deliverAdminPush(messages, input.fetchImpl || fetch);
  } catch (error) {
    console.warn("[admin-push] skipped", error instanceof Error ? error.message : error);
  }
}

async function deliverAdminPush(messages: ExpoMessage[], fetchImpl: typeof fetch) {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json"
  };
  if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetchImpl(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) continue;
    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = Array.isArray(json?.data) ? json.data : [];
    const dead = deadPushTokens(chunk, tickets);
    if (!dead.length) continue;
    await prisma.adminDevice.updateMany({
      where: { pushToken: { in: dead } },
      data: { pushToken: null }
    });
  }
}

/** Pending payments, recent failures, and approved commissions. Called from the reconcile job. */
export async function scanAdminPaymentAlerts(now = new Date(), fetchImpl?: typeof fetch) {
  try {
    const pendingSince = new Date(now.getTime() - 30 * 60 * 1000);
    const recent = new Date(now.getTime() - 60 * 60 * 1000);
    const [pending, failed, payouts] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "PENDING", createdAt: { lt: pendingSince } },
        select: { id: true },
        take: 20,
        orderBy: { createdAt: "asc" }
      }),
      prisma.payment.findMany({
        where: { status: "FAILED", updatedAt: { gte: recent } },
        select: { id: true },
        take: 20,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.shopCommission.groupBy({
        by: ["agentId"],
        where: { status: "APPROVED" },
        _sum: { amountPaise: true }
      })
    ]);
    for (const row of pending) {
      await queueAdminPush({
        event: "failedPayment",
        collapseKey: `pending:${row.id}`,
        title: "Payment still pending",
        body: "A payment has been waiting for more than 30 minutes.",
        windowSeconds: 1800,
        fetchImpl
      });
    }
    for (const row of failed) {
      await queueAdminPush({
        event: "failedPayment",
        collapseKey: `failed:${row.id}`,
        title: "Payment failed",
        body: "A payment failed.",
        windowSeconds: 86400,
        fetchImpl
      });
    }
    for (const row of payouts.slice(0, 20)) {
      if ((row._sum.amountPaise || 0) <= 0) continue;
      await queueAdminPush({
        event: "payoutDue",
        collapseKey: row.agentId,
        title: "Payout due",
        body: "An agent has approved commission ready to pay.",
        windowSeconds: 86400,
        fetchImpl
      });
    }
  } catch (error) {
    console.warn("[admin-push] scan skipped", error instanceof Error ? error.message : error);
  }
}

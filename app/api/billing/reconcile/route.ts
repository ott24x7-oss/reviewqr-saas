import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { reconcileAllPending, expireStale } from "@/lib/manual-payments";
import { expireLapsedSubscriptions, promoteYoupiQueue, sendRenewalReminders } from "@/lib/billing-jobs";
import { timingSafeEqualString } from "@/lib/timing-safe";

/**
 * Reconcile all pending UPI/USDT orders against the inbox in one pass.
 * Auth: either an `x-cron-secret` header matching CRON_SECRET (for a scheduled
 * job) or an admin session (manual "check now" from the admin panel).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || "";
  const envSecret = process.env.CRON_SECRET || "";
  let authed = false;
  if (envSecret && secret && timingSafeEqualString(secret, envSecret)) {
    authed = true;
  } else {
    const guard = await requireAdminApi();
    if (!("error" in guard)) authed = true;
  }
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await reconcileAllPending();
    const expiredOrders = await expireStale();
    const expiredSubscriptions = await expireLapsedSubscriptions();
    const reminders = await sendRenewalReminders();
    const queue = await promoteYoupiQueue();
    return NextResponse.json({
      ...result,
      expired: expiredOrders,
      expiredSubscriptions,
      reminders,
      queue
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Reconcile failed" }, { status: 500 });
  }
}

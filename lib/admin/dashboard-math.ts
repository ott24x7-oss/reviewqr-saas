export type RevenuePayment = { id: string; amount: number };

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function revenueBreakdown(payments: RevenuePayment[], firstPaymentIds: Iterable<string>, refunds: number) {
  const firstPayments = new Set(firstPaymentIds);
  let newPaise = 0;
  let renewalPaise = 0;
  for (const payment of payments) {
    if (firstPayments.has(payment.id)) newPaise += payment.amount;
    else renewalPaise += payment.amount;
  }
  return {
    newPaise,
    renewalPaise,
    refundPaise: refunds,
    netPaise: newPaise + renewalPaise - refunds
  };
}

export function activationStats(signups: Array<{ hasBusiness: boolean }>) {
  const activated = signups.reduce((sum, user) => sum + Number(user.hasBusiness), 0);
  return {
    activated,
    total: signups.length,
    rate: signups.length ? Math.round((activated / signups.length) * 100) : 0
  };
}

/** Rows may be grouped: count says how many subscriptions share the row (default 1). */
export function planMix(rows: Array<{ planId: string | null; name: string; status: string; pricePaise: number; duration: string | null; count?: number }>) {
  const monthly = (price: number, duration: string | null) => {
    if (duration === "YEAR_1") return Math.round(price / 12);
    if (duration === "MONTH_6") return Math.round(price / 6);
    if (duration === "LIFETIME") return 0;
    return price;
  };
  const mix = new Map<string, { planId: string | null; name: string; count: number; mrrPaise: number }>();
  for (const row of rows) {
    const key = row.planId || row.name || "custom";
    const current = mix.get(key) || { planId: row.planId, name: row.name || "Custom", count: 0, mrrPaise: 0 };
    const count = row.count ?? 1;
    current.count += count;
    if (row.status === "ACTIVE") current.mrrPaise += monthly(row.pricePaise, row.duration) * count;
    mix.set(key, current);
  }
  return [...mix.values()].sort((a, b) => b.count - a.count);
}

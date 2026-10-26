/** Indian financial year, 1 April through 31 March, in Asia/Kolkata. */
export function financialYearBounds(on: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric"
  }).formatToParts(on);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const startYear = month >= 4 ? year : year - 1;
  return {
    start: new Date(`${startYear}-04-01T00:00:00+05:30`),
    end: new Date(`${startYear + 1}-04-01T00:00:00+05:30`)
  };
}

/**
 * TDS applies only to the part of this payout that sits above the yearly threshold.
 * Earlier payouts in the same financial year count toward that threshold.
 */
export function tdsForPayout(input: {
  grossPaise: number;
  alreadyGrossPaise: number;
  tdsPercent: number;
  thresholdPaise: number;
}) {
  const grossPaise = Math.max(0, Math.floor(input.grossPaise));
  const before = Math.max(0, Math.floor(input.alreadyGrossPaise));
  const threshold = Math.max(0, Math.floor(input.thresholdPaise));
  const percent = Math.max(0, input.tdsPercent);
  const taxableBefore = Math.max(0, before - threshold);
  const taxableAfter = Math.max(0, before + grossPaise - threshold);
  const taxableNow = Math.max(0, taxableAfter - taxableBefore);
  const tdsPaise = Math.min(grossPaise, Math.floor((taxableNow * percent) / 100));
  return { grossPaise, tdsPaise, netPaise: grossPaise - tdsPaise };
}

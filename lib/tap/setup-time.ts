export type SetupMark = { userId: string; kind: string; createdAt: Date };

/** Pair each owner's signup mark with the first time one of their codes became active. */
export function pairSetupMarks(rows: SetupMark[]) {
  const byUser = new Map<string, { start?: Date; activated?: Date }>();
  for (const row of rows) {
    const current = byUser.get(row.userId) || {};
    if (row.kind === "start" && !current.start) current.start = row.createdAt;
    if (row.kind === "qr_activated" && !current.activated) current.activated = row.createdAt;
    byUser.set(row.userId, current);
  }
  return [...byUser.values()].filter(
    (row): row is { start: Date; activated: Date } => !!row.start && !!row.activated
  );
}

export function medianMinutes(pairs: { start: Date; activated: Date }[]) {
  const values = pairs
    .map((pair) => (pair.activated.getTime() - pair.start.getTime()) / 60000)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return { median: null as number | null, sample: 0 };
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  return { median: Math.round(median), sample: values.length };
}

const BASE_MS = 5_000;
const CAP_MS = 60 * 60 * 1000;

/** Delay after a failure. `attempts` is the count already recorded on the row. */
export function nextRunAt(attempts: number, now = Date.now()) {
  const exponent = Math.max(0, attempts - 1);
  const multiplier = exponent >= 20 ? Number.POSITIVE_INFINITY : 2 ** exponent;
  const delay = Math.min(BASE_MS * multiplier, CAP_MS);
  return new Date(now + delay);
}

export const HEARTBEAT_STALE_MS = 30_000;

export function heartbeatFresh(seenAt: Date | null, now = Date.now(), staleMs = HEARTBEAT_STALE_MS) {
  if (!seenAt) return false;
  return now - seenAt.getTime() < staleMs;
}

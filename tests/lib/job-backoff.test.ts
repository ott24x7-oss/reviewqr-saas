import { describe, expect, it } from "vitest";
import { heartbeatFresh, nextRunAt } from "../../lib/jobs/backoff";

describe("job backoff", () => {
  const now = Date.parse("2026-10-22T12:00:00.000Z");

  it("doubles from 5 seconds and caps at one hour", () => {
    expect(nextRunAt(1, now).getTime() - now).toBe(5_000);
    expect(nextRunAt(2, now).getTime() - now).toBe(10_000);
    expect(nextRunAt(3, now).getTime() - now).toBe(20_000);
    expect(nextRunAt(20, now).getTime() - now).toBe(60 * 60 * 1000);
  });

  it("treats a heartbeat older than 30 seconds as stale", () => {
    expect(heartbeatFresh(null, now)).toBe(false);
    expect(heartbeatFresh(new Date(now - 29_000), now)).toBe(true);
    expect(heartbeatFresh(new Date(now - 30_000), now)).toBe(false);
  });
});

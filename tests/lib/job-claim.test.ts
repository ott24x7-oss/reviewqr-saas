import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { claimById, claimNext, enqueueJob, markRetry, releaseStaleLocks } from "../../lib/jobs/store";

describe("job claim", () => {
  const keys: string[] = [];

  afterAll(async () => {
    if (keys.length) await prisma.job.deleteMany({ where: { idempotencyKey: { in: keys } } });
  });

  it("returns the existing row when the idempotency key is reused", async () => {
    const idempotencyKey = `test-job-${Date.now()}`;
    keys.push(idempotencyKey);
    const first = await enqueueJob({ type: "test.once", payload: { n: 1 }, idempotencyKey });
    try {
      const second = await enqueueJob({ type: "test.once", payload: { n: 2 }, idempotencyKey });
      expect(second.id).toBe(first.id);
    } finally {
      await prisma.job.delete({ where: { id: first.id } }).catch(() => {});
    }
  });

  it("claims a pending job once, skips a future job, and retries with backoff", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const ready = await tx.job.create({ data: { type: "test.claim", payload: { ok: true } } });
        const first = await claimById(ready.id, "test-worker", tx);
        expect(first?.attempts).toBe(1);
        expect(await claimById(ready.id, "test-worker", tx)).toBeNull();

        await tx.job.create({
          data: { type: "test.later", payload: {}, runAt: new Date(Date.now() + 60_000) }
        });
        const other = await tx.job.create({
          data: { type: "test.ready", payload: {}, runAt: new Date(0) }
        });
        const next = await claimNext("test-worker", tx);
        expect(next?.id).toBe(other.id);

        await markRetry(other.id, "boom", tx);
        const retried = await tx.job.findUnique({ where: { id: other.id } });
        expect(retried?.status).toBe("PENDING");
        expect(retried!.runAt.getTime()).toBeGreaterThan(Date.now() + 4_000);

        await tx.job.create({
          data: {
            type: "test.stale",
            payload: {},
            status: "RUNNING",
            attempts: 1,
            maxAttempts: 5,
            lockedUntil: new Date(Date.now() - 1_000)
          }
        });
        await tx.job.create({
          data: {
            type: "test.stale-dead",
            payload: {},
            status: "RUNNING",
            attempts: 5,
            maxAttempts: 5,
            lockedUntil: new Date(Date.now() - 1_000)
          }
        });
        await releaseStaleLocks(tx);
        expect((await tx.job.findFirst({ where: { type: "test.stale" } }))?.status).toBe("PENDING");
        expect((await tx.job.findFirst({ where: { type: "test.stale-dead" } }))?.status).toBe("FAILED");
        throw new Error("rollback");
      })
    ).rejects.toThrow("rollback");
  });
});

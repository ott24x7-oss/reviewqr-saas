import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { heartbeatFresh, nextRunAt } from "./backoff";

type Db = PrismaClient | Prisma.TransactionClient;

export type ClaimedJob = {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
};

const claimColumns = Prisma.sql`
  j."id", j."type", j."payload", j."attempts", j."maxAttempts"
`;

function mapJob(row: ClaimedJob | undefined): ClaimedJob | null {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    attempts: Number(row.attempts),
    maxAttempts: Number(row.maxAttempts)
  };
}

export function webWorkerId() {
  return process.env.WORKER_ID || "web";
}

export async function enqueueJob(
  input: {
    type: string;
    payload?: Prisma.InputJsonValue;
    idempotencyKey?: string;
    runAt?: Date;
    maxAttempts?: number;
  },
  db: Db = prisma
) {
  if (input.idempotencyKey) {
    const existing = await db.job.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
  }
  try {
    return await db.job.create({
      data: {
        type: input.type,
        payload: input.payload ?? {},
        idempotencyKey: input.idempotencyKey,
        runAt: input.runAt,
        maxAttempts: input.maxAttempts ?? 5
      }
    });
  } catch (error) {
    if (
      input.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await db.job.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return existing;
    }
    throw error;
  }
}

/** One open job per type. A finished row does not block the next run. */
export async function enqueueOpen(type: string, payload: Prisma.InputJsonValue = {}) {
  const open = await prisma.job.findFirst({
    where: { type, status: { in: ["PENDING", "RUNNING"] } },
    orderBy: { createdAt: "asc" }
  });
  if (open) return open;
  return enqueueJob({ type, payload });
}

export async function claimById(id: string, workerId: string, db: Db = prisma) {
  const rows = await db.$queryRaw<ClaimedJob[]>`
    WITH picked AS (
      SELECT "id" FROM "Job"
      WHERE "id" = ${id} AND "status" = 'PENDING'::"JobStatus"
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "Job" AS j
    SET "status" = 'RUNNING'::"JobStatus",
        "lockedBy" = ${workerId},
        "lockedUntil" = NOW() + INTERVAL '2 minutes',
        "attempts" = j."attempts" + 1,
        "updatedAt" = NOW()
    FROM picked
    WHERE j."id" = picked."id"
    RETURNING ${claimColumns}
  `;
  return mapJob(rows[0]);
}

export async function claimNext(workerId: string, db: Db = prisma) {
  const rows = await db.$queryRaw<ClaimedJob[]>`
    WITH picked AS (
      SELECT "id" FROM "Job"
      WHERE "status" = 'PENDING'::"JobStatus" AND "runAt" <= NOW()
      ORDER BY "runAt" ASC, "id" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "Job" AS j
    SET "status" = 'RUNNING'::"JobStatus",
        "lockedBy" = ${workerId},
        "lockedUntil" = NOW() + INTERVAL '2 minutes',
        "attempts" = j."attempts" + 1,
        "updatedAt" = NOW()
    FROM picked
    WHERE j."id" = picked."id"
    RETURNING ${claimColumns}
  `;
  return mapJob(rows[0]);
}

export async function releaseStaleLocks(db: Db = prisma) {
  await db.$executeRaw`
    UPDATE "Job"
    SET "status" = CASE
          WHEN "attempts" >= "maxAttempts" THEN 'FAILED'::"JobStatus"
          ELSE 'PENDING'::"JobStatus"
        END,
        "runAt" = CASE
          WHEN "attempts" >= "maxAttempts" THEN "runAt"
          ELSE NOW()
        END,
        "lockedBy" = NULL,
        "lockedUntil" = NULL,
        "finishedAt" = CASE
          WHEN "attempts" >= "maxAttempts" THEN NOW()
          ELSE NULL
        END,
        "lastError" = COALESCE("lastError", 'lock expired'),
        "updatedAt" = NOW()
    WHERE "status" = 'RUNNING'::"JobStatus"
      AND "lockedUntil" IS NOT NULL
      AND "lockedUntil" < NOW()
  `;
}

export async function markDone(id: string, db: Db = prisma) {
  await db.job.update({
    where: { id },
    data: { status: "DONE", lockedBy: null, lockedUntil: null, finishedAt: new Date(), lastError: null }
  });
}

export async function markRetry(id: string, message: string, db: Db = prisma) {
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return;
  const text = message.slice(0, 500);
  if (job.attempts >= job.maxAttempts) {
    await db.job.update({
      where: { id },
      data: { status: "FAILED", lastError: text, lockedBy: null, lockedUntil: null, finishedAt: new Date() }
    });
    return;
  }
  await db.job.update({
    where: { id },
    data: {
      status: "PENDING",
      lastError: text,
      lockedBy: null,
      lockedUntil: null,
      runAt: nextRunAt(job.attempts)
    }
  });
}

export async function touchHeartbeat(workerId: string, db: Db = prisma) {
  const seenAt = new Date();
  await db.workerHeartbeat.upsert({
    where: { id: workerId },
    create: { id: workerId, seenAt },
    update: { seenAt }
  });
}

export async function workerIsFresh(now = new Date(), db: Db = prisma) {
  const row = await db.workerHeartbeat.findFirst({ orderBy: { seenAt: "desc" } });
  return heartbeatFresh(row?.seenAt ?? null, now.getTime());
}

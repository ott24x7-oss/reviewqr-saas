import { prisma } from "../db";

/** Same statement as the services migration. Idempotent on a populated database. */
export async function backfillServiceKinds() {
  return prisma.$executeRaw`
    UPDATE "MenuItem" SET "kind" = 'SERVICE' WHERE "durationMinutes" IS NOT NULL
  `;
}

import { prisma } from "@/lib/db";
import { APP_EVENT_NAMES, type AppEventName } from "./events";

export type FunnelRow = { name: AppEventName; events: number; installs: number };

/** Counts for the last 30 days. installId is a random device id, not an account. */
export async function appFunnel(): Promise<FunnelRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ name: string; events: number; installs: number }>>`
    SELECT "name", COUNT(*)::int AS events, COUNT(DISTINCT "installId")::int AS installs
    FROM "AppEvent"
    WHERE "createdAt" >= ${since}
    GROUP BY "name"
  `;
  return APP_EVENT_NAMES.map((name) => {
    const row = rows.find((item) => item.name === name);
    return {
      name,
      events: Number(row?.events ?? 0),
      installs: Number(row?.installs ?? 0)
    };
  });
}

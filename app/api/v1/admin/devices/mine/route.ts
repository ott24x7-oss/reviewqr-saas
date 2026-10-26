import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { v1Data } from "@/lib/api/v1";
import { requireAdminActor } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const rows = await prisma.adminDevice.findMany({
    where: { userId: auth.actor.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, platform: true, status: true, lastSeenAt: true }
  });
  return v1Data({
    devices: rows.map((row) => ({
      id: row.id,
      name: row.name,
      platform: row.platform,
      status: row.status,
      lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
      current: row.id === auth.actor.device.id
    }))
  });
}
export const GET = observe(getHandler);

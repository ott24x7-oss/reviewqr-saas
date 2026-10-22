import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { announcementVisible } from "@/lib/help/audience";
import { loadEntitlement } from "@/lib/plans/entitlements";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const now = new Date();
  const [user, ent, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.user.id }, select: { role: true } }),
    loadEntitlement(auth.user.id),
    prisma.announcement.findMany({
      where: {
        published: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        dismissals: { none: { userId: auth.user.id } }
      },
      orderBy: { startsAt: "desc" },
      take: 20
    })
  ]);
  const visible = rows.filter((row) =>
    announcementVisible({
      audience: row.audience,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      now,
      modules: ent.modules,
      isAgent: user?.role === "AGENT"
    })
  );
  return v1Data(
    visible.map((row) => ({
      id: row.id,
      title: row.title,
      titleHi: row.titleHi,
      body: row.body,
      bodyHi: row.bodyHi,
      link: row.link,
      audience: row.audience
    }))
  );
}

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id || "");
  if (!id) return v1Error(400, "VALIDATION", "id is required");
  const row = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!row) return v1Error(404, "NOT_FOUND", "Announcement not found");
  await prisma.announcementDismiss.upsert({
    where: { userId_announcementId: { userId: auth.user.id, announcementId: id } },
    create: { userId: auth.user.id, announcementId: id },
    update: {}
  });
  return v1Data({ id, dismissed: true });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

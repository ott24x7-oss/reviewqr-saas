import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

/**
 * Public — fetch up to 4 random unused review templates for a business slug.
 * Used by the post-rating "pick a review" step on /r/[slug].
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `tpl-pick:${ip}`, limit: 30, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down" }, { status: 429 });

  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, isActive: true, archived: true }
  });
  if (!business || !business.isActive || business.archived) {
    return NextResponse.json({ items: [], stockEmpty: true });
  }

  // Postgres ORDER BY RANDOM() is fine for a small unused stock per business.
  // Cast to any because Prisma's $queryRaw types don't narrow the result well here.
  const items = (await prisma.$queryRaw<Array<{ id: string; content: string }>>`
    SELECT "id", "content"
    FROM "ReviewTemplate"
    WHERE "businessId" = ${business.id} AND "used" = false
    ORDER BY RANDOM()
    LIMIT 4
  `) as Array<{ id: string; content: string }>;

  return NextResponse.json({
    items,
    stockEmpty: items.length === 0
  });
}

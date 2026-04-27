import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

async function getOwnedBusiness(id: string, userId: string) {
  return prisma.business.findFirst({
    where: { id, ownerId: userId, archived: false },
    select: { id: true }
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const biz = await getOwnedBusiness(params.id, user.id);
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "available" | "used" | undefined

  const where: any = { businessId: biz.id };
  if (status === "available") where.used = false;
  if (status === "used") where.used = true;

  const [items, available, used] = await Promise.all([
    prisma.reviewTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.reviewTemplate.count({ where: { businessId: biz.id, used: false } }),
    prisma.reviewTemplate.count({ where: { businessId: biz.id, used: true } })
  ]);

  return NextResponse.json({ items, stats: { available, used, total: available + used } });
}

const bulkSchema = z.object({
  contents: z.array(z.string().min(5).max(2000)).min(1).max(500)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const biz = await getOwnedBusiness(params.id, user.id);
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bulkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const seen = new Set<string>();
  const data = parsed.data.contents
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 5) return false;
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((content) => ({ businessId: biz.id, content }));

  if (data.length === 0) {
    return NextResponse.json({ error: "No valid templates to add" }, { status: 400 });
  }

  const result = await prisma.reviewTemplate.createMany({ data });
  return NextResponse.json({ ok: true, added: result.count });
}

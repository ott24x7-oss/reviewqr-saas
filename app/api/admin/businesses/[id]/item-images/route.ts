import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getImageAiConfig } from "@/lib/settings";
import { buildItemImagePrompt } from "@/lib/ai-images";
import { enqueueJob } from "@/lib/jobs/store";
import { rateLimitDb } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const business = await prisma.business.findUnique({ where: { id: params.id }, select: { id: true, name: true, industry: true } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const filter = req.nextUrl.searchParams.get("filter") === "all" ? "all" : "no_photo";
  const items = await prisma.menuItem.findMany({
    where: { businessId: business.id, ...(filter === "no_photo" ? { photo: null, photos: { isEmpty: true } } : {}) },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take: 500,
    include: { category: { select: { name: true } }, imageJobs: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  return NextResponse.json({ business, filter, items });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const rate = await rateLimitDb({ key: `admin-item-image:${guard.user.id}`, limit: 20, windowSeconds: 3600 });
  if (!rate.ok) return NextResponse.json({ error: "Too many image requests. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { itemIds?: unknown[] };
  const ids = Array.isArray(body.itemIds) ? [...new Set(body.itemIds.filter((id): id is string => typeof id === "string"))] : [];
  if (!ids.length || ids.length > 50) return NextResponse.json({ error: "Select between 1 and 50 items" }, { status: 400 });
  const cfg = await getImageAiConfig();
  if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ error: "Image AI is disabled or has no API key" }, { status: 503 });
  const business = await prisma.business.findUnique({ where: { id: params.id }, select: { id: true, industry: true } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const items = await prisma.menuItem.findMany({ where: { id: { in: ids }, businessId: business.id }, include: { category: { select: { name: true } } } });
  if (items.length !== ids.length) return NextResponse.json({ error: "One or more items do not belong to this business" }, { status: 400 });
  let created = 0;
  let alreadyOpen = 0;
  for (const item of items) {
    const open = await prisma.itemImageJob.findFirst({ where: { itemId: item.id, status: { in: ["QUEUED", "RUNNING", "READY"] } } });
    if (open) { alreadyOpen++; continue; }
    const prompt = buildItemImagePrompt(cfg, {
      name: item.name, description: item.description, category: item.category?.name,
      kind: item.kind, veg: item.veg, businessCategory: business.industry
    });
    const job = await prisma.itemImageJob.create({
      data: { businessId: business.id, itemId: item.id, prompt, requestedById: guard.user.id }
    });
    try {
      await enqueueJob({
        type: "item-image.generate",
        payload: { itemImageJobId: job.id },
        idempotencyKey: `item-image.generate:${job.id}`
      });
      created++;
    } catch (error) {
      await prisma.itemImageJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Could not queue image" } });
    }
  }
  await logAudit({ userId: guard.user.id, action: "item-image.generate", entity: "Business", entityId: business.id, metadata: { requested: ids.length, queued: created, alreadyOpen } });
  return NextResponse.json({ created, alreadyOpen });
}

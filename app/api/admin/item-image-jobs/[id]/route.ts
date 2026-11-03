import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getImageAiConfig } from "@/lib/settings";
import { buildItemImagePrompt } from "@/lib/ai-images";
import { enqueueJob } from "@/lib/jobs/store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = await req.json().catch(() => ({})) as { action?: string; extraPromptNote?: string };
  const job = await prisma.itemImageJob.findUnique({ where: { id: params.id }, include: { item: { include: { category: true } }, business: { select: { industry: true } } } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (body.action === "reject") {
    if (!["READY", "FAILED"].includes(job.status)) return NextResponse.json({ error: "This image is not ready to reject" }, { status: 409 });
    await prisma.itemImageJob.update({ where: { id: job.id }, data: { status: "REJECTED", decidedById: guard.user.id } });
    await logAudit({ userId: guard.user.id, action: "item-image.reject", entity: "ItemImageJob", entityId: job.id });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "regenerate") {
    const cfg = await getImageAiConfig();
    if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ error: "Image AI is disabled or has no API key" }, { status: 503 });
    const note = String(body.extraPromptNote || "").trim().slice(0, 250);
    const prompt = buildItemImagePrompt(cfg, {
      name: job.item.name, description: job.item.description, category: job.item.category?.name,
      kind: job.item.kind, veg: job.item.veg, businessCategory: job.business.industry, extraPromptNote: note
    });
    await prisma.itemImageJob.update({ where: { id: job.id }, data: { status: "QUEUED", prompt, candidateUrl: null, error: null, requestedById: guard.user.id, decidedById: null } });
    await enqueueJob({ type: "item-image.generate", payload: { itemImageJobId: job.id }, idempotencyKey: `item-image.generate:${job.id}:${Date.now()}` });
    await logAudit({ userId: guard.user.id, action: "item-image.regenerate", entity: "ItemImageJob", entityId: job.id, metadata: { hasExtraPromptNote: !!note } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action must be reject or regenerate" }, { status: 400 });
}

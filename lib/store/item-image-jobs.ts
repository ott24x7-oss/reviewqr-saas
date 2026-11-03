import { prisma } from "../db";
import { getImageAiConfig } from "../settings";
import { generateItemImage } from "../ai-images";
import { storeUpload } from "../storage";

export async function processItemImageJob(id: string) {
  const job = await prisma.itemImageJob.findUnique({
    where: { id }, include: { item: { include: { category: true } }, business: { select: { industry: true } } }
  });
  if (!job) throw new Error("Item image job not found");
  if (["APPROVED", "REJECTED"].includes(job.status)) return { skipped: true };
  await prisma.itemImageJob.update({ where: { id }, data: { status: "RUNNING", error: null } });
  try {
    const cfg = await getImageAiConfig();
    const bytes = await generateItemImage(cfg, {
      name: job.item.name,
      description: job.item.description,
      category: job.item.category?.name,
      kind: job.item.kind,
      veg: job.item.veg,
      businessCategory: job.business.industry
    }, job.prompt);
    const stored = await storeUpload({ bytes, variant: "cover" });
    await prisma.itemImageJob.update({
      where: { id }, data: { status: "READY", candidateUrl: stored.url, error: null }
    });
    return { ready: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    await prisma.itemImageJob.update({ where: { id }, data: { status: "FAILED", error: message.slice(0, 2000) } });
    throw error;
  }
}

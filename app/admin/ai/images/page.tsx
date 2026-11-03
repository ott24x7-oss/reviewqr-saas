import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getImageAiConfig } from "@/lib/settings";
import { dayKey } from "@/lib/entitlements";
import { ImageJobQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function AdminImageQueuePage() {
  await requireAdminPage();
  const [jobs, config, spend] = await Promise.all([
    prisma.itemImageJob.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: {
      business: { select: { id: true, name: true } }, item: { select: { id: true, name: true, photo: true, photos: true } }
    } }),
    getImageAiConfig(),
    prisma.platformAiSpend.findUnique({ where: { day: dayKey() } })
  ]);
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">AI item photo queue</h1><p className="text-sm text-muted-foreground">Review generated photos across businesses. Today’s estimated spend: ₹{((spend?.paise || 0) / 100).toFixed(2)} / ₹{(config.dailyCapPaise / 100).toFixed(2)}.</p></div>
    <ImageJobQueue initial={jobs.map((job) => ({
      id: job.id, status: job.status, candidateUrl: job.candidateUrl, error: job.error, createdAt: job.createdAt.toISOString(),
      business: job.business, item: job.item
    }))} />
  </div>;
}

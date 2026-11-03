import { prisma } from "../db";
import { logAudit } from "../admin";
import { sendPushToUsers } from "../push";

export async function approveItemImageJobs(adminId: string, ids: string[], keepOldAsGallery = false) {
  const jobs = await prisma.itemImageJob.findMany({ where: { id: { in: ids }, status: "READY", candidateUrl: { not: null } }, include: { item: true, business: { select: { id: true, name: true, ownerId: true } } } });
  if (!jobs.length) return { approved: 0 };
  const owners = new Map<string, { ownerId: string; count: number }>();
  const approvedIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const job of jobs) {
      const updated = await tx.itemImageJob.updateMany({ where: { id: job.id, status: "READY" } , data: { status: "APPROVED", decidedById: adminId, error: null } });
      if (!updated.count) continue;
      const photos = keepOldAsGallery && job.item.photo
        ? [...new Set([job.item.photo, ...job.item.photos])].slice(0, 5)
        : job.item.photos;
      await tx.menuItem.update({ where: { id: job.itemId }, data: { photo: job.candidateUrl!, ...(keepOldAsGallery && job.item.photo ? { photos } : {}) } });
      approvedIds.push(job.id);
      const current = owners.get(job.businessId) || { ownerId: job.business.ownerId, count: 0 };
      current.count++;
      owners.set(job.businessId, current);
    }
  });
  for (const [businessId, info] of owners) {
    const message = `${info.count} item ${info.count === 1 ? "photo was" : "photos were"} added by QR24x7`;
    await prisma.notification.create({ data: {
      userId: info.ownerId, type: "item_photos_added", title: "New item photos",
      message, link: "/dashboard", metadata: { businessId, count: info.count }
    } });
    await sendPushToUsers([info.ownerId], { title: "New item photos", body: message, data: { type: "item_photos_added", businessId } }).catch((error) => {
      console.warn("[item-image] owner push failed", error instanceof Error ? error.message : "push failed");
    });
  }
  await logAudit({ userId: adminId, action: "item-image.approve", entity: "ItemImageJob", metadata: { jobIds: approvedIds, keepOldAsGallery } });
  return { approved: approvedIds.length };
}

export async function rejectItemImageJobs(adminId: string, ids: string[]) {
  const changed = await prisma.itemImageJob.updateMany({
    where: { id: { in: ids }, status: { in: ["READY", "FAILED"] } },
    data: { status: "REJECTED", decidedById: adminId }
  });
  await logAudit({ userId: adminId, action: "item-image.reject", entity: "ItemImageJob", metadata: { count: changed.count, jobIds: ids } });
  return { rejected: changed.count };
}

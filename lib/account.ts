/**
 * Account erasure keeps Payment rows and invoice snapshots.
 * Businesses (and their cascaded reviews, feedback, and QR codes) are removed,
 * then the user row is anonymized so the payment foreign key still holds.
 */
import { prisma } from "./db";
import { anonymizedUserPatch } from "./privacy";

export async function eraseAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    const businesses = await tx.business.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });
    const businessIds = businesses.map((b) => b.id);
    if (businessIds.length) {
      await tx.testimonial.deleteMany({ where: { businessId: { in: businessIds } } });
    }
    await tx.business.deleteMany({ where: { ownerId: userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.apiKey.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: anonymizedUserPatch(userId)
    });
  });
}

import { Prisma } from "@prisma/client";
import { prisma } from "../db";

export type ReportChannel = "email" | "whatsapp";

/** Claim a channel for each business. A row that already exists is left alone. */
export async function claimDeliveries(businessIds: string[], weekKey: string, channel: ReportChannel) {
  const claimed: string[] = [];
  for (const businessId of businessIds) {
    try {
      await prisma.reportDelivery.create({ data: { businessId, weekKey, channel } });
      claimed.push(businessId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return claimed;
}

/** Drop claims when the send failed so the next run can try that channel again. */
export async function releaseDeliveries(businessIds: string[], weekKey: string, channel: ReportChannel) {
  if (!businessIds.length) return;
  await prisma.reportDelivery.deleteMany({ where: { businessId: { in: businessIds }, weekKey, channel } });
}

/**
 * Credit the paying owner's only assigned agent after a plan payment.
 * Shop-order commission is snapshotted separately and is not paid here.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getShopCheckoutConfig } from "@/lib/settings";
import { commissionPaise, soleAgentId } from "./commission";

export async function creditRenewalCommission(ownerId: string, paymentId: string, amountPaise: number) {
  const businesses = await prisma.business.findMany({
    where: { ownerId, archived: false },
    select: { agentId: true }
  });
  const agentId = soleAgentId(businesses.map((business) => business.agentId));
  if (!agentId) return;
  const config = await getShopCheckoutConfig();
  const amount = commissionPaise(amountPaise, config.commissionPercent);
  if (amount <= 0) return;
  try {
    await prisma.shopCommission.create({
      data: {
        agentId,
        kind: "RENEWAL",
        sourceId: paymentId,
        amountPaise: amount,
        percent: config.commissionPercent
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

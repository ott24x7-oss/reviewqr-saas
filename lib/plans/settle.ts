import { prisma } from "../db";
import { creditRenewalCommission } from "../shop/renewal-commission";

/** Runs after a plan payment is confirmed. A repeat call does not create a second commission. */
export async function settleConfirmedPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, amount: true, status: true }
  });
  if (!payment || payment.status !== "COMPLETED") return;
  await creditRenewalCommission(payment.userId, payment.id, payment.amount);
}

-- A paid commission that is later reversed. The agent already received the money,
-- so the row records what they owe back. settledAt stays null until a later payout deducts it.
-- New table only.

CREATE TABLE "ClawbackDue" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "ClawbackDue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClawbackDue_commissionId_key" ON "ClawbackDue"("commissionId");
CREATE INDEX "ClawbackDue_agentId_settledAt_idx" ON "ClawbackDue"("agentId", "settledAt");

ALTER TABLE "ClawbackDue" ADD CONSTRAINT "ClawbackDue_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClawbackDue" ADD CONSTRAINT "ClawbackDue_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "ShopCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

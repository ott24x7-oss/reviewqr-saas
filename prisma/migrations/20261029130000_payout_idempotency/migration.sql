-- One payout per agent and UTR. The admin form also sends an idempotency key
-- so a double submit returns the same row.
ALTER TABLE "CommissionPayout" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "CommissionPayout_agentId_utr_key" ON "CommissionPayout"("agentId", "utr");
CREATE UNIQUE INDEX "CommissionPayout_idempotencyKey_key" ON "CommissionPayout"("idempotencyKey");

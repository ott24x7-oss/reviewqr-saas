-- One payout per agent and UTR. The admin form also sends an idempotency key
-- so a double submit returns the same row.
ALTER TABLE "CommissionPayout" ADD COLUMN "idempotencyKey" TEXT;

-- Refuse the unique index while two payouts already share an agent and a UTR.
-- Do not delete those rows here.
DO $$
DECLARE
  dupes integer;
BEGIN
  SELECT COUNT(*) INTO dupes
  FROM (
    SELECT "agentId", "utr"
    FROM "CommissionPayout"
    GROUP BY "agentId", "utr"
    HAVING COUNT(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION 'Cannot add CommissionPayout (agentId, utr) unique index: % duplicate groups exist', dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX "CommissionPayout_agentId_utr_key" ON "CommissionPayout"("agentId", "utr");
CREATE UNIQUE INDEX "CommissionPayout_idempotencyKey_key" ON "CommissionPayout"("idempotencyKey");

-- The plan migration stamped every existing commission APPROVED with
-- approvedAt equal to createdAt. Those rows were not reviewed. Keep them
-- out of the payable balance until an admin approves or marks them paid.
UPDATE "ShopCommission"
SET "status" = 'LEGACY_UNSETTLED'
WHERE "status" = 'APPROVED'
  AND "payoutId" IS NULL
  AND "approvedAt" IS NOT NULL
  AND "approvedAt" = "createdAt";

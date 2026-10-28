-- Restore the intended default for new businesses. Only backfill rows that
-- have no post-regression edit; a newer updatedAt is treated as an owner
-- choice and is deliberately left untouched.
UPDATE "Business"
SET "reviewGating" = true
WHERE "reviewGating" = false
  AND (
    "updatedAt" <= TIMESTAMP '2026-10-21 12:00:00'
    OR (
      "createdAt" > TIMESTAMP '2026-10-21 12:00:00'
      AND "updatedAt" = "createdAt"
    )
  );

ALTER TABLE "Business" ALTER COLUMN "reviewGating" SET DEFAULT true;

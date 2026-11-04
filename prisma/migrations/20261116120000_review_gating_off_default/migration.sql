-- Review gating can route customers away from public review links based on rating.
-- Disable it for every existing business and make the safe state the default.
UPDATE "Business" SET "reviewGating" = false WHERE "reviewGating" = true;

ALTER TABLE "Business" ALTER COLUMN "reviewGating" SET DEFAULT false;

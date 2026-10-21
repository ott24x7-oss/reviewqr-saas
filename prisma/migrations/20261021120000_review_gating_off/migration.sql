-- Review gating is off for every business, including rows that already exist.
ALTER TABLE "Business" ADD COLUMN "reviewGating" BOOLEAN NOT NULL DEFAULT false;

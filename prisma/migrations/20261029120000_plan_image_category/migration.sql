ALTER TABLE "Plan" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'reviews';
ALTER TABLE "Plan" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';

UPDATE "Plan"
SET "category" = 'menu'
WHERE cardinality("modules") = 1 AND 'MENU' = ANY("modules");

UPDATE "Plan"
SET "category" = 'store'
WHERE cardinality("modules") = 1 AND 'STORE' = ANY("modules");

UPDATE "Plan"
SET "category" = 'combo'
WHERE cardinality("modules") > 1;

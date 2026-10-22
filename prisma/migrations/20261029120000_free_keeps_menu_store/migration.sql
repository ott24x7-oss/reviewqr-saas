-- FREE on origin/main includes the menu and the store. The first plan
-- migration stored reviews only. Put those modules back on the legacy free
-- plan and on snapshots that were copied from it. Catalogue plans are untouched.
UPDATE "Plan"
SET "modules" = ARRAY['REVIEWS','MENU','STORE']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'plan_legacy_free';

UPDATE "Subscription"
SET "modules" = ARRAY['REVIEWS','MENU','STORE']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "planId" = 'plan_legacy_free';

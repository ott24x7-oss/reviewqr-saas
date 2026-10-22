-- Migrated Free, Starter, Growth, and Agency stay in the catalogue.
-- They stay off the pricing page unless an admin turns visibleOnPricingPage back on.
UPDATE "Plan"
SET "visibleOnPricingPage" = false
WHERE "id" IN (
  'plan_legacy_free',
  'plan_legacy_starter',
  'plan_legacy_growth',
  'plan_legacy_agency'
);

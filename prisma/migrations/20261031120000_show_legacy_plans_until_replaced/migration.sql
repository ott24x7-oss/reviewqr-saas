-- Keep today's plans on the pricing page until an admin publishes new plans
-- and turns these off in Admin -> Plans. Hiding them before any new plan
-- exists would leave the landing page without products.
UPDATE "Plan"
SET "visibleOnPricingPage" = true
WHERE "id" IN (
  'plan_legacy_free',
  'plan_legacy_starter',
  'plan_legacy_growth',
  'plan_legacy_agency'
)
AND NOT EXISTS (
  SELECT 1 FROM "Plan" p
  WHERE p."active" = true
    AND p."visibleOnPricingPage" = true
    AND p."id" NOT LIKE 'plan_legacy_%'
);

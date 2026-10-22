-- Module plans, subscription snapshots, agent profiles, and owner referral rewards.
-- Existing tier columns on User stay. This backfill copies them so current customers keep access.

CREATE TYPE "PlanDuration" AS ENUM ('MONTH_1', 'MONTH_6', 'YEAR_1', 'LIFETIME');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REVERSED');
CREATE TYPE "CommissionBasis" AS ENUM ('PERCENT', 'FLAT');
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'APPLIED', 'REVERSED');

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionHi" TEXT NOT NULL DEFAULT '',
    "modules" TEXT[],
    "limits" JSONB NOT NULL,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visibleOnPricingPage" BOOLEAN NOT NULL DEFAULT true,
    "legacyTier" "SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "Plan_active_sortOrder_idx" ON "Plan"("active", "sortOrder");
CREATE INDEX "Plan_visibleOnPricingPage_sortOrder_idx" ON "Plan"("visibleOnPricingPage", "sortOrder");

CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "duration" "PlanDuration" NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "mrpPaise" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanPrice_planId_duration_key" ON "PlanPrice"("planId", "duration");
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "modules" TEXT[],
    "limits" JSONB NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "duration" "PlanDuration",
    "status" "SubscriptionStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "pricePaise" INTEGER NOT NULL DEFAULT 0,
    "pendingPlanId" TEXT,
    "pendingDuration" "PlanDuration",
    "pendingModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pendingLimits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE UNIQUE INDEX "Subscription_one_open_per_user" ON "Subscription"("userId") WHERE "status" IN ('ACTIVE', 'TRIALING', 'PAST_DUE');
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "planId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "duration" "PlanDuration";
ALTER TABLE "Payment" ADD COLUMN "modules" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Payment" ADD COLUMN "limits" JSONB;
ALTER TABLE "Payment" ADD COLUMN "creditPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "payerVpa" TEXT;
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShopCommission" ADD COLUMN "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ShopCommission" ADD COLUMN "basis" "CommissionBasis" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "ShopCommission" ADD COLUMN "flatPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShopCommission" ADD COLUMN "saleKind" TEXT NOT NULL DEFAULT 'RENEWAL';
ALTER TABLE "ShopCommission" ADD COLUMN "holdUntil" TIMESTAMP(3);
ALTER TABLE "ShopCommission" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "ShopCommission" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "ShopCommission" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "ShopCommission" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "ShopCommission" ADD COLUMN "planId" TEXT;
ALTER TABLE "ShopCommission" ADD COLUMN "payoutId" TEXT;
UPDATE "ShopCommission" SET "status" = 'APPROVED', "approvedAt" = "createdAt" WHERE "status" = 'PENDING';
CREATE INDEX "ShopCommission_paymentId_idx" ON "ShopCommission"("paymentId");
CREATE INDEX "ShopCommission_status_holdUntil_idx" ON "ShopCommission"("status", "holdUntil");
CREATE INDEX "ShopCommission_payoutId_idx" ON "ShopCommission"("payoutId");

CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upiId" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "AgentProfile"("userId");
CREATE UNIQUE INDEX "AgentProfile_code_key" ON "AgentProfile"("code");
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "planId" TEXT,
    "hardware" BOOLEAN NOT NULL DEFAULT false,
    "firstBasis" "CommissionBasis" NOT NULL DEFAULT 'PERCENT',
    "firstPercent" INTEGER NOT NULL DEFAULT 0,
    "firstFlatPaise" INTEGER NOT NULL DEFAULT 0,
    "renewalBasis" "CommissionBasis" NOT NULL DEFAULT 'PERCENT',
    "renewalPercent" INTEGER NOT NULL DEFAULT 0,
    "renewalFlatPaise" INTEGER NOT NULL DEFAULT 0,
    "renewalMonths" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommissionRule_agentId_planId_hardware_idx" ON "CommissionRule"("agentId", "planId", "hardware");
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "utr" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommissionPayout_agentId_paidAt_idx" ON "CommissionPayout"("agentId", "paidAt");
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopCommission" ADD CONSTRAINT "ShopCommission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopCommission" ADD CONSTRAINT "ShopCommission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "CommissionPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OwnerReferral" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnerReferral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OwnerReferral_userId_key" ON "OwnerReferral"("userId");
CREATE UNIQUE INDEX "OwnerReferral_code_key" ON "OwnerReferral"("code");
ALTER TABLE "OwnerReferral" ADD CONSTRAINT "OwnerReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SignupAttribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "referrerUserId" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignupAttribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SignupAttribution_userId_key" ON "SignupAttribution"("userId");
CREATE INDEX "SignupAttribution_agentId_idx" ON "SignupAttribution"("agentId");
CREATE INDEX "SignupAttribution_referrerUserId_idx" ON "SignupAttribution"("referrerUserId");
ALTER TABLE "SignupAttribution" ADD CONSTRAINT "SignupAttribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignupAttribution" ADD CONSTRAINT "SignupAttribution_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "bonusDays" INTEGER NOT NULL DEFAULT 0,
    "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "asCredit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralReward_referredUserId_key" ON "ReferralReward"("referredUserId");
CREATE UNIQUE INDEX "ReferralReward_paymentId_key" ON "ReferralReward"("paymentId");
CREATE INDEX "ReferralReward_referrerUserId_status_idx" ON "ReferralReward"("referrerUserId", "status");
CREATE INDEX "ReferralReward_status_holdUntil_idx" ON "ReferralReward"("status", "holdUntil");
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReferralCredit" (
    "userId" TEXT NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralCredit_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgentOnboarding" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "businessId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentOnboarding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgentOnboarding_agentId_createdAt_idx" ON "AgentOnboarding"("agentId", "createdAt");
CREATE INDEX "AgentOnboarding_phone_idx" ON "AgentOnboarding"("phone");
ALTER TABLE "AgentOnboarding" ADD CONSTRAINT "AgentOnboarding_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the plans that match today's tiers. Admins can edit prices later.
INSERT INTO "Plan" ("id", "nameEn", "nameHi", "slug", "descriptionEn", "descriptionHi", "modules", "limits", "badge", "sortOrder", "active", "visibleOnPricingPage", "legacyTier", "createdAt", "updatedAt")
VALUES
('plan_legacy_free', 'Free', 'मुफ़्त', 'free', 'Try ReviewQR risk-free', 'ReviewQR बिना जोखिम आज़माएँ', ARRAY['REVIEWS']::TEXT[], '{"businesses":1,"qrCodes":2,"products":100000,"staff":1,"aiCalls":30,"locations":1,"reviews":50,"campaigns":1,"reviewTemplates":10,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":30}'::jsonb, NULL, 0, true, true, 'FREE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_legacy_starter', 'Starter', 'स्टार्टर', 'starter', 'For single-location shops', 'एक लोकेशन वाली दुकान के लिए', ARRAY['REVIEWS','MENU','STORE']::TEXT[], '{"businesses":1,"qrCodes":50,"products":100000,"staff":5,"aiCalls":300,"locations":1,"reviews":1000,"campaigns":10,"reviewTemplates":100,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":300}'::jsonb, NULL, 1, true, true, 'STARTER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_legacy_growth', 'Growth', 'ग्रोथ', 'growth', 'For multi-location SMBs', 'कई लोकेशन वाले कारोबार के लिए', ARRAY['REVIEWS','MENU','STORE']::TEXT[], '{"businesses":5,"qrCodes":500,"products":100000,"staff":100,"aiCalls":2000,"locations":25,"reviews":10000,"campaigns":50,"reviewTemplates":1000,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":2000}'::jsonb, 'Best value', 2, true, true, 'GROWTH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_legacy_agency', 'Agency', 'एजेंसी', 'agency', 'White-label for agencies', 'एजेंसियों के लिए व्हाइट-लेबल', ARRAY['REVIEWS','MENU','STORE']::TEXT[], '{"businesses":10000,"qrCodes":100000,"products":100000,"staff":100000,"aiCalls":100000,"locations":100000,"reviews":1000000,"campaigns":100000,"reviewTemplates":100000,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":100000}'::jsonb, NULL, 3, true, true, 'AGENCY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_legacy_founder', 'Founder', 'फाउंडर', 'founder', 'Lifetime access, limited quantity', 'सीमित संख्या में लाइफटाइम', ARRAY['REVIEWS','MENU','STORE']::TEXT[], '{"businesses":5,"qrCodes":500,"products":100000,"staff":100,"aiCalls":2000,"locations":25,"reviews":10000,"campaigns":50,"reviewTemplates":1000,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":2000}'::jsonb, NULL, 4, true, false, 'FOUNDER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "PlanPrice" ("id", "planId", "duration", "pricePaise", "mrpPaise", "active", "createdAt", "updatedAt")
VALUES
('price_free_m1', 'plan_legacy_free', 'MONTH_1', 0, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_free_m6', 'plan_legacy_free', 'MONTH_6', 0, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_free_y1', 'plan_legacy_free', 'YEAR_1', 0, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_starter_m1', 'plan_legacy_starter', 'MONTH_1', 49900, 49900, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_starter_m6', 'plan_legacy_starter', 'MONTH_6', 299400, 299400, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_starter_y1', 'plan_legacy_starter', 'YEAR_1', 499900, 598800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_growth_m1', 'plan_legacy_growth', 'MONTH_1', 99900, 99900, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_growth_m6', 'plan_legacy_growth', 'MONTH_6', 599400, 599400, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_growth_y1', 'plan_legacy_growth', 'YEAR_1', 999900, 1198800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_agency_m1', 'plan_legacy_agency', 'MONTH_1', 299900, 299900, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_agency_m6', 'plan_legacy_agency', 'MONTH_6', 1799400, 1799400, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_agency_y1', 'plan_legacy_agency', 'YEAR_1', 2999900, 3598800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('price_founder_life', 'plan_legacy_founder', 'LIFETIME', 0, NULL, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Subscription" (
    "id", "userId", "planId", "modules", "limits", "tier", "duration", "status", "startsAt", "endsAt", "pricePaise", "pendingModules", "createdAt", "updatedAt"
)
SELECT
    'legacy_' || u."id",
    u."id",
    CASE u."subscriptionTier"
        WHEN 'FREE' THEN 'plan_legacy_free'
        WHEN 'STARTER' THEN 'plan_legacy_starter'
        WHEN 'GROWTH' THEN 'plan_legacy_growth'
        WHEN 'AGENCY' THEN 'plan_legacy_agency'
        ELSE 'plan_legacy_founder'
    END,
    CASE WHEN u."subscriptionTier" = 'FREE' THEN ARRAY['REVIEWS']::TEXT[] ELSE ARRAY['REVIEWS','MENU','STORE']::TEXT[] END,
    CASE u."subscriptionTier"
        WHEN 'FREE' THEN '{"businesses":1,"qrCodes":2,"products":100000,"staff":1,"aiCalls":30,"locations":1,"reviews":50,"campaigns":1,"reviewTemplates":10,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":30}'::jsonb
        WHEN 'STARTER' THEN '{"businesses":1,"qrCodes":50,"products":100000,"staff":5,"aiCalls":300,"locations":1,"reviews":1000,"campaigns":10,"reviewTemplates":100,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":300}'::jsonb
        WHEN 'AGENCY' THEN '{"businesses":10000,"qrCodes":100000,"products":100000,"staff":100000,"aiCalls":100000,"locations":100000,"reviews":1000000,"campaigns":100000,"reviewTemplates":100000,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":100000}'::jsonb
        ELSE '{"businesses":5,"qrCodes":500,"products":100000,"staff":100,"aiCalls":2000,"locations":25,"reviews":10000,"campaigns":50,"reviewTemplates":1000,"storeProducts":100000,"storeOrders":100000,"aiCallsPerMonth":2000}'::jsonb
    END,
    u."subscriptionTier",
    CASE WHEN u."subscriptionTier" = 'FOUNDER' AND u."subscriptionStatus" = 'ACTIVE' THEN 'LIFETIME'::"PlanDuration" ELSE NULL END,
    u."subscriptionStatus",
    u."createdAt",
    CASE
        WHEN u."subscriptionTier" = 'FOUNDER' AND u."subscriptionStatus" = 'ACTIVE' THEN NULL
        WHEN u."subscriptionEndsAt" IS NOT NULL THEN u."subscriptionEndsAt"
        WHEN u."subscriptionStatus" = 'TRIALING' THEN u."trialEndsAt"
        ELSE NULL
    END,
    0,
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u."id");

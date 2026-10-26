-- Team building. Existing agent rows stay ACTIVE at depth 1.
-- New enum values are not used in this migration, so they can be added in the same transaction.

ALTER TYPE "ShopCommissionKind" ADD VALUE 'SALE';
ALTER TYPE "ShopCommissionKind" ADD VALUE 'HARDWARE';
ALTER TYPE "ShopCommissionKind" ADD VALUE 'TEAM_OVERRIDE';

CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED');

ALTER TABLE "AgentProfile" ADD COLUMN "leaderId" TEXT;
ALTER TABLE "AgentProfile" ADD COLUMN "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AgentProfile" ADD COLUMN "sharePercent" INTEGER;
ALTER TABLE "AgentProfile" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AgentProfile" ADD COLUMN "pan" TEXT;
ALTER TABLE "AgentProfile" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "AgentProfile" ADD COLUMN "bankIfsc" TEXT;
ALTER TABLE "AgentProfile" ADD COLUMN "bankName" TEXT;

ALTER TABLE "ShopCommission" ADD COLUMN "sharePercent" INTEGER;
ALTER TABLE "ShopCommission" ADD COLUMN "leaderId" TEXT;

ALTER TABLE "CommissionPayout" ADD COLUMN "grossPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommissionPayout" ADD COLUMN "tdsPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommissionPayout" ADD COLUMN "netPaise" INTEGER NOT NULL DEFAULT 0;

-- Historical payouts had no TDS. Gross and net match the amount that was sent.
UPDATE "CommissionPayout"
SET "grossPaise" = "amountPaise", "netPaise" = "amountPaise"
WHERE "grossPaise" = 0 AND "netPaise" = 0 AND "tdsPaise" = 0;

CREATE TABLE "AgentInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "phone" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentInvite_code_key" ON "AgentInvite"("code");
CREATE INDEX "AgentInvite_leaderId_createdAt_idx" ON "AgentInvite"("leaderId", "createdAt");
CREATE INDEX "AgentProfile_leaderId_idx" ON "AgentProfile"("leaderId");
CREATE INDEX "AgentProfile_status_idx" ON "AgentProfile"("status");
CREATE INDEX "ShopCommission_leaderId_idx" ON "ShopCommission"("leaderId");

ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentInvite" ADD CONSTRAINT "AgentInvite_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopCommission" ADD CONSTRAINT "ShopCommission_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

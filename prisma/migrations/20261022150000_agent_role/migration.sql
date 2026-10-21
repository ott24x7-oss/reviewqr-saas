ALTER TYPE "UserRole" ADD VALUE 'AGENT';

ALTER TABLE "Business" ADD COLUMN "agentId" TEXT;

CREATE INDEX "Business_agentId_idx" ON "Business"("agentId");

ALTER TABLE "Business" ADD CONSTRAINT "Business_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

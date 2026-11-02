CREATE TYPE "AgentApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "AgentApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AgentApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "applicantName" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "howSell" VARCHAR(32) NOT NULL,
    "experience" VARCHAR(500) NOT NULL DEFAULT '',
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "referralOrTeamCode" VARCHAR(80) NOT NULL DEFAULT '',
    "termsVersion" VARCHAR(40) NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "rejectionReason" VARCHAR(500),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentApplication_userId_key" ON "AgentApplication"("userId");
CREATE INDEX "AgentApplication_status_appliedAt_idx" ON "AgentApplication"("status", "appliedAt");

ALTER TABLE "AgentApplication" ADD CONSTRAINT "AgentApplication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

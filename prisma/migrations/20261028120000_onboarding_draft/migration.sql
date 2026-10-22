-- CreateTable
CREATE TABLE "OnboardingDraft" (
    "userId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "referralAsked" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "businessId" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

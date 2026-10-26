-- Spent admin step-up tokens. A token's jti is stored on first use, so it cannot be replayed.
-- New table only.

CREATE TABLE "StepUpUse" (
    "jti" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StepUpUse_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX "StepUpUse_usedAt_idx" ON "StepUpUse"("usedAt");

CREATE TYPE "ItemImageJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'APPROVED', 'REJECTED', 'FAILED');

CREATE TABLE "ItemImageJob" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "ItemImageJobStatus" NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT NOT NULL,
    "candidateUrl" TEXT,
    "error" TEXT,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemImageJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItemImageJob_businessId_status_createdAt_idx" ON "ItemImageJob"("businessId", "status", "createdAt");
CREATE INDEX "ItemImageJob_itemId_status_idx" ON "ItemImageJob"("itemId", "status");

ALTER TABLE "ItemImageJob" ADD CONSTRAINT "ItemImageJob_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemImageJob" ADD CONSTRAINT "ItemImageJob_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

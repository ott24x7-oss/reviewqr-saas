CREATE TYPE "ShopCancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ShopOrderCancellationRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "status" "ShopCancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "refundAmountPaise" INTEGER NOT NULL DEFAULT 0,
  "refundMethod" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopOrderCancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopOrderCancellationRequest_orderId_key" ON "ShopOrderCancellationRequest"("orderId");
CREATE UNIQUE INDEX "ShopOrderCancellationRequest_ticketId_key" ON "ShopOrderCancellationRequest"("ticketId");
CREATE INDEX "ShopOrderCancellationRequest_status_createdAt_idx" ON "ShopOrderCancellationRequest"("status", "createdAt");
CREATE INDEX "ShopOrderCancellationRequest_userId_createdAt_idx" ON "ShopOrderCancellationRequest"("userId", "createdAt");

ALTER TABLE "ShopOrderCancellationRequest"
  ADD CONSTRAINT "ShopOrderCancellationRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

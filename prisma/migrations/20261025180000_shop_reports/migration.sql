-- Agent commission, reprint requests, and credit notes for shop orders.
ALTER TABLE "ShopOrder" ADD COLUMN "agentId" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN "commissionPercent" INTEGER;
ALTER TABLE "ShopOrder" ADD COLUMN "commissionPaise" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ShopOrder_agentId_idx" ON "ShopOrder"("agentId");

ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "ShopCommissionKind" AS ENUM ('ORDER', 'RENEWAL');

CREATE TABLE "ShopCommission" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "kind" "ShopCommissionKind" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "orderId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCommission_agentId_kind_sourceId_key" ON "ShopCommission"("agentId", "kind", "sourceId");
CREATE INDEX "ShopCommission_agentId_createdAt_idx" ON "ShopCommission"("agentId", "createdAt");
CREATE INDEX "ShopCommission_orderId_idx" ON "ShopCommission"("orderId");

ALTER TABLE "ShopCommission" ADD CONSTRAINT "ShopCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopCommission" ADD CONSTRAINT "ShopCommission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopReprintRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReprintRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopReprintRequest_orderId_idx" ON "ShopReprintRequest"("orderId");

ALTER TABLE "ShopReprintRequest" ADD CONSTRAINT "ShopReprintRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShopCreditNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "taxablePaise" INTEGER NOT NULL,
    "cgstPaise" INTEGER NOT NULL,
    "sgstPaise" INTEGER NOT NULL,
    "igstPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCreditNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCreditNote_number_key" ON "ShopCreditNote"("number");
CREATE INDEX "ShopCreditNote_orderId_idx" ON "ShopCreditNote"("orderId");

ALTER TABLE "ShopCreditNote" ADD CONSTRAINT "ShopCreditNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

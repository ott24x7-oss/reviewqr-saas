-- ReviewQR shop orders. Plan payments stay on Payment.
CREATE TYPE "ShopOrderStatus" AS ENUM (
  'PENDING_PAYMENT',
  'PAID',
  'PROOF_SENT',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PRINTING',
  'NFC_WRITTEN',
  'PACKED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RTO',
  'REPRINT'
);

CREATE TYPE "ShopPayStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE "ShopOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT,
  "status" "ShopOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentStatus" "ShopPayStatus" NOT NULL DEFAULT 'PENDING',
  "subtotalPaise" INTEGER NOT NULL,
  "discountPaise" INTEGER NOT NULL,
  "totalPaise" INTEGER NOT NULL,
  "taxablePaise" INTEGER NOT NULL,
  "cgstPaise" INTEGER NOT NULL,
  "sgstPaise" INTEGER NOT NULL,
  "igstPaise" INTEGER NOT NULL,
  "advancePaise" INTEGER NOT NULL,
  "balancePaise" INTEGER NOT NULL,
  "cod" BOOLEAN NOT NULL DEFAULT false,
  "couponCode" TEXT,
  "referralCode" TEXT,
  "buyerGstin" TEXT,
  "buyerLegalName" TEXT,
  "buyerState" TEXT,
  "sellerName" TEXT,
  "sellerGstin" TEXT,
  "sellerState" TEXT,
  "addressJson" JSONB,
  "providerPaymentId" TEXT,
  "checkoutUrl" TEXT,
  "utr" TEXT,
  "verifiedVia" TEXT,
  "invoiceNumber" TEXT,
  "invoiceIssuedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "fingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopOrder_providerPaymentId_key" ON "ShopOrder"("providerPaymentId");
CREATE UNIQUE INDEX "ShopOrder_invoiceNumber_key" ON "ShopOrder"("invoiceNumber");
CREATE INDEX "ShopOrder_userId_createdAt_idx" ON "ShopOrder"("userId", "createdAt");
CREATE INDEX "ShopOrder_status_idx" ON "ShopOrder"("status");
CREATE INDEX "ShopOrder_paymentStatus_idx" ON "ShopOrder"("paymentStatus");
CREATE INDEX "ShopOrder_businessId_idx" ON "ShopOrder"("businessId");

ALTER TABLE "ShopOrder"
  ADD CONSTRAINT "ShopOrder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopOrder"
  ADD CONSTRAINT "ShopOrder_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopOrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "variantId" TEXT,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unitPaise" INTEGER NOT NULL,
  "hsn" TEXT NOT NULL,
  "gstPercent" INTEGER NOT NULL,
  "discountPaise" INTEGER NOT NULL,
  "netPaise" INTEGER NOT NULL,
  "taxablePaise" INTEGER NOT NULL,
  "cgstPaise" INTEGER NOT NULL,
  "sgstPaise" INTEGER NOT NULL,
  "igstPaise" INTEGER NOT NULL,
  "ships" BOOLEAN NOT NULL,
  "needsDesign" BOOLEAN NOT NULL,
  "needsNfc" BOOLEAN NOT NULL,
  "weightGrams" INTEGER NOT NULL,
  "includedTier" "SubscriptionTier",
  "includedMonths" INTEGER,
  "includedLifetime" BOOLEAN NOT NULL DEFAULT false,
  "design" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopOrderLine_orderId_idx" ON "ShopOrderLine"("orderId");
CREATE INDEX "ShopOrderLine_variantId_idx" ON "ShopOrderLine"("variantId");

ALTER TABLE "ShopOrderLine"
  ADD CONSTRAINT "ShopOrderLine_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopOrderLine"
  ADD CONSTRAINT "ShopOrderLine_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "CatalogVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopPaymentDelivery" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopPaymentDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopPaymentDelivery_deliveryId_key" ON "ShopPaymentDelivery"("deliveryId");

ALTER TABLE "ShopPaymentDelivery"
  ADD CONSTRAINT "ShopPaymentDelivery_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

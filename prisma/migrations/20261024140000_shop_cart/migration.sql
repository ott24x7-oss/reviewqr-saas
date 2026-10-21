-- Owner shop cart. Separate from a business's WhatsApp menu orders.
CREATE TABLE "ShopCart" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT,
  "couponCode" TEXT,
  "referralCode" TEXT,
  "buyerGstin" TEXT,
  "buyerLegalName" TEXT,
  "addressId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCart_userId_key" ON "ShopCart"("userId");

ALTER TABLE "ShopCart"
  ADD CONSTRAINT "ShopCart_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShopCartLine" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "design" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopCartLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCartLine_cartId_variantId_key" ON "ShopCartLine"("cartId", "variantId");
CREATE INDEX "ShopCartLine_variantId_idx" ON "ShopCartLine"("variantId");

ALTER TABLE "ShopCartLine"
  ADD CONSTRAINT "ShopCartLine_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopCartLine"
  ADD CONSTRAINT "ShopCartLine_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "CatalogVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

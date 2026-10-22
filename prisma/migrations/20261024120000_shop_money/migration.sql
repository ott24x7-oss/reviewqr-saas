-- Founder is a lifetime tier sold only as a capped catalogue SKU.
-- Do not insert FOUNDER rows in this file. Seed them with Prisma after deploy.
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'FOUNDER';

ALTER TABLE "CatalogVariant" ADD COLUMN "includedTier" "SubscriptionTier",
ADD COLUMN "includedMonths" INTEGER,
ADD COLUMN "includedLifetime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ships" BOOLEAN NOT NULL DEFAULT true;

-- ReviewQR shop coupons. Separate from a business's store Coupon table.
CREATE TABLE "ShopCoupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "percentOff" INTEGER,
  "flatPaise" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCoupon_code_key" ON "ShopCoupon"("code");

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" TEXT,
  "percentOff" INTEGER,
  "flatPaise" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_userId_idx" ON "ReferralCode"("userId");

ALTER TABLE "ReferralCode"
  ADD CONSTRAINT "ReferralCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShippingAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShippingAddress_userId_idx" ON "ShippingAddress"("userId");

ALTER TABLE "ShippingAddress"
  ADD CONSTRAINT "ShippingAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

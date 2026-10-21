-- CreateEnum
CREATE TYPE "StoreLayout" AS ENUM ('AUTO', 'FOOD', 'SHOP', 'SERVICES');

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "layout" "StoreLayout" NOT NULL DEFAULT 'AUTO',
    "hours" JSONB,
    "holiday" BOOLEAN NOT NULL DEFAULT false,
    "dineIn" BOOLEAN NOT NULL DEFAULT true,
    "takeaway" BOOLEAN NOT NULL DEFAULT true,
    "delivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryPincodes" TEXT NOT NULL DEFAULT '',
    "deliveryChargePaise" INTEGER NOT NULL DEFAULT 0,
    "freeDeliveryAbovePaise" INTEGER,
    "minOrderPaise" INTEGER NOT NULL DEFAULT 0,
    "packingChargePaise" INTEGER NOT NULL DEFAULT 0,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gstPercent" INTEGER NOT NULL DEFAULT 5,
    "pricesIncludeGst" BOOLEAN NOT NULL DEFAULT true,
    "prepMinutes" INTEGER NOT NULL DEFAULT 20,
    "upiId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreSettings_businessId_key" ON "StoreSettings"("businessId");

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "MenuOrder" ADD COLUMN "orderType" TEXT,
ADD COLUMN "pincode" TEXT,
ADD COLUMN "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deliveryPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "packingPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gstPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pricesIncludeGst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "orderForLater" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prepMinutes" INTEGER;

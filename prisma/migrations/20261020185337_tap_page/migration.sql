-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "VegMark" AS ENUM ('VEG', 'NON_VEG', 'EGG', 'NONE');

-- CreateEnum
CREATE TYPE "MenuOrderStatus" AS ENUM ('NEW');

-- DropForeignKey
ALTER TABLE "QRCode" DROP CONSTRAINT "QRCode_businessId_fkey";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "whatsappVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QRCode" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "businessId" DROP NOT NULL;

-- Printed codes that were already switched off stay disabled.
UPDATE "QRCode" SET "status" = 'DISABLED' WHERE "isActive" = false;

-- AlterTable
ALTER TABLE "QrScan" ADD COLUMN     "event" TEXT NOT NULL DEFAULT 'view',
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "TapEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "qrCodeId" TEXT,
    "type" TEXT NOT NULL,
    "linkKey" TEXT,
    "source" TEXT,
    "deviceType" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TapPage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "photo" TEXT,
    "veg" "VegMark" NOT NULL DEFAULT 'NONE',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "number" TEXT NOT NULL,
    "customerName" TEXT,
    "tableOrAddress" TEXT,
    "note" TEXT,
    "totalPaise" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "source" TEXT,
    "status" "MenuOrderStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryPreset" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "links" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingMark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TapEvent_businessId_createdAt_idx" ON "TapEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "TapEvent_qrCodeId_createdAt_idx" ON "TapEvent"("qrCodeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TapPage_businessId_key" ON "TapPage"("businessId");

-- CreateIndex
CREATE INDEX "MenuCategory_businessId_idx" ON "MenuCategory"("businessId");

-- CreateIndex
CREATE INDEX "MenuItem_businessId_available_idx" ON "MenuItem"("businessId", "available");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuOrder_number_key" ON "MenuOrder"("number");

-- CreateIndex
CREATE INDEX "MenuOrder_businessId_createdAt_idx" ON "MenuOrder"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryPreset_industry_key" ON "IndustryPreset"("industry");

-- CreateIndex
CREATE INDEX "OnboardingMark_userId_idx" ON "OnboardingMark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingMark_userId_kind_key" ON "OnboardingMark"("userId", "kind");

-- CreateIndex
CREATE INDEX "QRCode_status_idx" ON "QRCode"("status");

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapEvent" ADD CONSTRAINT "TapEvent_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapPage" ADD CONSTRAINT "TapPage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOrder" ADD CONSTRAINT "MenuOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOrder" ADD CONSTRAINT "MenuOrder_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingMark" ADD CONSTRAINT "OnboardingMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

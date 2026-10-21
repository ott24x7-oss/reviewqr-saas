-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('CARD', 'STANDEE', 'STICKER', 'KEYCHAIN');

-- CreateEnum
CREATE TYPE "NfcChip" AS ENUM ('NTAG213', 'NTAG215', 'NTAG216');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'ACTIVE', 'DISABLED', 'LOST');

-- CreateTable
CREATE TABLE "PrintBatch" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "count" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "chipUid" TEXT,
    "chip" "NfcChip",
    "status" "DeviceStatus" NOT NULL DEFAULT 'IN_STOCK',
    "batchId" TEXT,
    "businessId" TEXT,
    "locationId" TEXT,
    "staffId" TEXT,
    "tableLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_shortCode_key" ON "Device"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Device_chipUid_key" ON "Device"("chipUid");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_batchId_idx" ON "Device"("batchId");

-- CreateIndex
CREATE INDEX "Device_businessId_idx" ON "Device"("businessId");

-- CreateIndex
CREATE INDEX "PrintBatch_createdById_idx" ON "PrintBatch"("createdById");

-- AddForeignKey
ALTER TABLE "PrintBatch" ADD CONSTRAINT "PrintBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_shortCode_fkey" FOREIGN KEY ("shortCode") REFERENCES "QRCode"("shortCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PrintBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

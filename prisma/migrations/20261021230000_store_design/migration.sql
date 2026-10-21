-- CreateEnum
CREATE TYPE "StoreDesign" AS ENUM ('CLASSIC', 'PREMIUM', 'MINIMAL', 'BOLD');

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN "design" "StoreDesign" NOT NULL DEFAULT 'CLASSIC';

-- AlterTable
ALTER TABLE "OfferBanner" ADD COLUMN "expiresAt" TIMESTAMP(3);

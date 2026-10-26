-- Catalogue mode, service fields, and WhatsApp booking requests.
-- Additive. Existing rows keep MENU, PRODUCT, FIXED, and bookable=true.

CREATE TYPE "CatalogMode" AS ENUM ('MENU', 'SERVICES', 'BOTH');
CREATE TYPE "MenuItemKind" AS ENUM ('PRODUCT', 'SERVICE');
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'FROM', 'ON_REQUEST');
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'CONFIRMED', 'DONE', 'CANCELLED', 'NO_SHOW');

ALTER TABLE "Business" ADD COLUMN "catalogMode" "CatalogMode" NOT NULL DEFAULT 'MENU';

ALTER TABLE "MenuItem" ADD COLUMN "kind" "MenuItemKind" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN "priceType" "PriceType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN "bookable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "MenuVariant" ADD COLUMN "durationMinutes" INTEGER;

-- Items that already stored a service length become services. Safe to run again.
UPDATE "MenuItem" SET "kind" = 'SERVICE' WHERE "durationMinutes" IS NOT NULL;

CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "consentAt" TIMESTAMP(3),
    "preferredDate" TEXT NOT NULL,
    "preferredSlot" TEXT,
    "preferredTime" TEXT,
    "note" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "lang" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingRequest_businessId_createdAt_idx" ON "BookingRequest"("businessId", "createdAt");
CREATE INDEX "BookingRequest_businessId_status_idx" ON "BookingRequest"("businessId", "status");
CREATE INDEX "BookingRequest_itemId_idx" ON "BookingRequest"("itemId");

ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

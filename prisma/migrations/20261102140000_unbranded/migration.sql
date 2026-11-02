CREATE TYPE "HideBrandingSource" AS ENUM ('PURCHASE', 'PLAN', 'ADMIN');

ALTER TABLE "Business"
  ADD COLUMN "hideBranding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hideBrandingSource" "HideBrandingSource";

ALTER TABLE "ShopCartLine"
  ADD COLUMN "unbranded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShopOrderLine"
  ADD COLUMN "unbranded" BOOLEAN NOT NULL DEFAULT false;

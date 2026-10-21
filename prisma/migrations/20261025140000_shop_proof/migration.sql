-- Design proof and the customer's change request on a shop line.
ALTER TABLE "ShopOrderLine" ADD COLUMN "proofUrl" TEXT;
ALTER TABLE "ShopOrderLine" ADD COLUMN "changeComment" TEXT;

-- Carrier booking and idempotent webhook events for shop orders.
CREATE TABLE "ShopShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "shipmentId" TEXT,
    "awb" TEXT,
    "courierName" TEXT,
    "pickupId" TEXT,
    "labelName" TEXT,
    "labelBase64" TEXT,
    "ndrNote" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopShipment_orderId_key" ON "ShopShipment"("orderId");
CREATE INDEX "ShopShipment_awb_idx" ON "ShopShipment"("awb");

ALTER TABLE "ShopShipment" ADD CONSTRAINT "ShopShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShopCarrierEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "awb" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCarrierEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCarrierEvent_eventKey_key" ON "ShopCarrierEvent"("eventKey");
CREATE INDEX "ShopCarrierEvent_awb_idx" ON "ShopCarrierEvent"("awb");

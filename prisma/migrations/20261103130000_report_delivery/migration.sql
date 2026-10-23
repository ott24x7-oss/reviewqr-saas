-- A weekly channel that already succeeded is not sent again.
CREATE TABLE "ReportDelivery" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportDelivery_businessId_weekKey_channel_key" ON "ReportDelivery"("businessId", "weekKey", "channel");
CREATE INDEX "ReportDelivery_weekKey_channel_idx" ON "ReportDelivery"("weekKey", "channel");
ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

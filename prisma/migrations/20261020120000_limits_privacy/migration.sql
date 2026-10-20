-- Plan limits, scan dedupe, AI usage, phone/email OTP, and DPDP account fields.
-- Payment activation and the YouPI queue are unchanged.

ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Review" ADD COLUMN "consentAt" TIMESTAMP(3);

CREATE INDEX "Review_businessId_rating_idx" ON "Review"("businessId", "rating");

CREATE INDEX "Feedback_businessId_status_idx" ON "Feedback"("businessId", "status");

-- shortCode is already unique, so the extra index is redundant.
DROP INDEX "QRCode_shortCode_idx";

CREATE TABLE "QrScan" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QrScan_qrCodeId_ipHash_createdAt_idx" ON "QrScan"("qrCodeId", "ipHash", "createdAt");

ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsage_businessId_month_key" ON "AiUsage"("businessId", "month");

CREATE INDEX "AiUsage_businessId_idx" ON "AiUsage"("businessId");

ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformAiSpend" (
    "day" TEXT NOT NULL,
    "paise" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformAiSpend_pkey" PRIMARY KEY ("day")
);

CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtp_identifier_purpose_idx" ON "EmailOtp"("identifier", "purpose");

CREATE INDEX "EmailOtp_tokenHash_idx" ON "EmailOtp"("tokenHash");

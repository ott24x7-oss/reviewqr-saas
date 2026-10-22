-- Append-only OTP delivery stats. Channel is a string: whatsapp, email, or dev.
CREATE TABLE "OtpDelivery" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpDelivery_createdAt_idx" ON "OtpDelivery"("createdAt");
CREATE INDEX "OtpDelivery_channel_createdAt_idx" ON "OtpDelivery"("channel", "createdAt");

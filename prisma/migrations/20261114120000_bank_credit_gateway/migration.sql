CREATE TABLE "BankCredit" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "utr" TEXT,
    "sender" TEXT NOT NULL,
    "payerName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "rawHash" TEXT NOT NULL,
    "signature" TEXT,
    "bodyExcerpt" TEXT NOT NULL,
    "paymentId" TEXT,
    "shopOrderId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankCredit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsGatewayDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "signingKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SmsGatewayDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsGatewayPairingToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsGatewayPairingToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankCredit_utr_key" ON "BankCredit"("utr");
CREATE UNIQUE INDEX "BankCredit_rawHash_key" ON "BankCredit"("rawHash");
CREATE UNIQUE INDEX "BankCredit_signature_key" ON "BankCredit"("signature");
CREATE UNIQUE INDEX "BankCredit_paymentId_key" ON "BankCredit"("paymentId");
CREATE UNIQUE INDEX "BankCredit_shopOrderId_key" ON "BankCredit"("shopOrderId");
ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_one_claim_target_check"
  CHECK ("paymentId" IS NULL OR "shopOrderId" IS NULL);
CREATE INDEX "BankCredit_source_receivedAt_idx" ON "BankCredit"("source", "receivedAt");
CREATE INDEX "BankCredit_paymentId_receivedAt_idx" ON "BankCredit"("paymentId", "receivedAt");
CREATE INDEX "BankCredit_amountPaise_receivedAt_idx" ON "BankCredit"("amountPaise", "receivedAt");
CREATE INDEX "SmsGatewayDevice_active_lastSeenAt_idx" ON "SmsGatewayDevice"("active", "lastSeenAt");
CREATE UNIQUE INDEX "SmsGatewayPairingToken_tokenHash_key" ON "SmsGatewayPairingToken"("tokenHash");
CREATE INDEX "SmsGatewayPairingToken_expiresAt_usedAt_idx" ON "SmsGatewayPairingToken"("expiresAt", "usedAt");

ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "SmsGatewayDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_shopOrderId_fkey"
  FOREIGN KEY ("shopOrderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopOrder" ADD COLUMN "expiresAt" TIMESTAMP(3);

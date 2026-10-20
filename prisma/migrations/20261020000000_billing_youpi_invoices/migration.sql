-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'YOUPI';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "invoiceNumber" TEXT,
ADD COLUMN "utr" TEXT,
ADD COLUMN "refundUtr" TEXT,
ADD COLUMN "queuePosition" INTEGER,
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "invoiceBuyerName" TEXT,
ADD COLUMN "invoiceBuyerGstin" TEXT,
ADD COLUMN "invoiceSellerName" TEXT,
ADD COLUMN "invoiceSellerGstin" TEXT,
ADD COLUMN "invoicePlaceOfSupply" TEXT,
ADD COLUMN "invoiceTaxablePaise" INTEGER,
ADD COLUMN "invoiceCgstPaise" INTEGER,
ADD COLUMN "invoiceSgstPaise" INTEGER,
ADD COLUMN "invoiceIgstPaise" INTEGER,
ADD COLUMN "invoiceIssuedAt" TIMESTAMP(3);

-- Keep payment rows if a user row is removed. Account deletion anonymizes instead.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "Payment"("invoiceNumber");
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "fy" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("fy")
);

-- CreateTable
CREATE TABLE "PaymentDelivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDelivery_deliveryId_key" ON "PaymentDelivery"("deliveryId");
CREATE INDEX "SubscriptionReminder_userId_idx" ON "SubscriptionReminder"("userId");
CREATE UNIQUE INDEX "SubscriptionReminder_userId_kind_periodEnd_key" ON "SubscriptionReminder"("userId", "kind", "periodEnd");

-- AddForeignKey
ALTER TABLE "PaymentDelivery" ADD CONSTRAINT "PaymentDelivery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionReminder" ADD CONSTRAINT "SubscriptionReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

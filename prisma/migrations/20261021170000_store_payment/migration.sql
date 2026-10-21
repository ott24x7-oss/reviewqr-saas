-- CreateEnum
CREATE TYPE "StorePayment" AS ENUM ('CASH', 'UPI');

-- AlterTable
ALTER TABLE "MenuOrder" ADD COLUMN "payment" "StorePayment";

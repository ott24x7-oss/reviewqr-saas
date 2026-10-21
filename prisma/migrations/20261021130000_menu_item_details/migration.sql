-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "bestseller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "mrpPaise" INTEGER;

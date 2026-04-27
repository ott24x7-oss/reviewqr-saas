-- CreateTable
CREATE TABLE "PlatformBranding" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "logoDataUrl" TEXT NOT NULL DEFAULT '',
    "brandName" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "footerText" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBranding_pkey" PRIMARY KEY ("id")
);

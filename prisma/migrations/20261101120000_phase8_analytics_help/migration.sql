-- Phase 8: menu item views, daily rollups, growth score, reports, help, announcements.
-- Existing scan, tap, order, and feedback tables stay as they are.

CREATE TABLE "MenuItemView" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItemView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MenuItemView_businessId_createdAt_idx" ON "MenuItemView"("businessId", "createdAt");
CREATE INDEX "MenuItemView_itemId_createdAt_idx" ON "MenuItemView"("itemId", "createdAt");

ALTER TABLE "MenuItemView" ADD CONSTRAINT "MenuItemView_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItemView" ADD CONSTRAINT "MenuItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AnalyticsDaily" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "tapsNfc" INTEGER NOT NULL DEFAULT 0,
    "tapsQr" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "buttonClicks" JSONB NOT NULL DEFAULT '{}',
    "menuViews" INTEGER NOT NULL DEFAULT 0,
    "topItems" JSONB NOT NULL DEFAULT '[]',
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "orderPaise" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratings" JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
    "hours" JSONB NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    "byQr" JSONB NOT NULL DEFAULT '[]',
    "byStaff" JSONB NOT NULL DEFAULT '[]',
    "byDevice" JSONB NOT NULL DEFAULT '{"mobile":0,"tablet":0,"desktop":0,"other":0}',
    "byTable" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsDaily_businessId_day_key" ON "AnalyticsDaily"("businessId", "day");
CREATE INDEX "AnalyticsDaily_businessId_day_idx" ON "AnalyticsDaily"("businessId", "day");
ALTER TABLE "AnalyticsDaily" ADD CONSTRAINT "AnalyticsDaily_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GrowthScore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "parts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthScore_businessId_day_key" ON "GrowthScore"("businessId", "day");
CREATE INDEX "GrowthScore_businessId_day_idx" ON "GrowthScore"("businessId", "day");
ALTER TABLE "GrowthScore" ADD CONSTRAINT "GrowthScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GrowthTipDone" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tipKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthTipDone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthTipDone_businessId_tipKey_key" ON "GrowthTipDone"("businessId", "tipKey");
ALTER TABLE "GrowthTipDone" ADD CONSTRAINT "GrowthTipDone_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReportPreference" (
    "userId" TEXT NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ReportPreference" ADD CONSTRAINT "ReportPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "contextKey" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HelpArticle_slug_language_key" ON "HelpArticle"("slug", "language");
CREATE INDEX "HelpArticle_published_language_sortOrder_idx" ON "HelpArticle"("published", "language", "sortOrder");
CREATE INDEX "HelpArticle_contextKey_published_idx" ON "HelpArticle"("contextKey", "published");

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "bodyHi" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT 'all',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_published_startsAt_endsAt_idx" ON "Announcement"("published", "startsAt", "endsAt");

CREATE TABLE "AnnouncementDismiss" (
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementDismiss_pkey" PRIMARY KEY ("userId", "announcementId")
);

ALTER TABLE "AnnouncementDismiss" ADD CONSTRAINT "AnnouncementDismiss_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementDismiss" ADD CONSTRAINT "AnnouncementDismiss_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "BlogPostStatus" AS ENUM ('draft', 'published');

CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "BlogPostStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'QR24x7',
    "translationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_locale_slug_key" ON "BlogPost"("locale", "slug");
CREATE INDEX "BlogPost_locale_status_publishedAt_idx" ON "BlogPost"("locale", "status", "publishedAt");
CREATE INDEX "BlogPost_translationKey_idx" ON "BlogPost"("translationKey");

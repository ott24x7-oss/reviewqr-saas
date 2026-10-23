CREATE TABLE "AppEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "installId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppEvent_name_createdAt_idx" ON "AppEvent"("name", "createdAt");
CREATE INDEX "AppEvent_installId_name_idx" ON "AppEvent"("installId", "name");

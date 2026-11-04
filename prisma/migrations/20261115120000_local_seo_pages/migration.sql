ALTER TABLE "Business" ADD COLUMN "listedInDirectory" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Business_listedInDirectory_city_industry_idx" ON "Business"("listedInDirectory", "city", "industry");

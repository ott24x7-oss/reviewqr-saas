-- ReviewQR hardware catalogue. Not the business WhatsApp store.
CREATE TABLE "CatalogProduct" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameHi" TEXT,
  "description" TEXT NOT NULL,
  "descriptionHi" TEXT,
  "needsNfc" BOOLEAN NOT NULL DEFAULT false,
  "needsDesign" BOOLEAN NOT NULL DEFAULT true,
  "defaultTemplateId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogProduct_slug_key" ON "CatalogProduct"("slug");

CREATE TABLE "CatalogVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameHi" TEXT,
  "costPaise" INTEGER NOT NULL,
  "mrpPaise" INTEGER NOT NULL,
  "salePaise" INTEGER NOT NULL,
  "hsn" TEXT NOT NULL,
  "gstPercent" INTEGER NOT NULL,
  "weightGrams" INTEGER NOT NULL,
  "lengthMm" INTEGER NOT NULL,
  "widthMm" INTEGER NOT NULL,
  "heightMm" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "lowStockAt" INTEGER NOT NULL DEFAULT 10,
  "minQty" INTEGER NOT NULL DEFAULT 1,
  "imageUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogVariant_sku_key" ON "CatalogVariant"("sku");
CREATE INDEX "CatalogVariant_productId_idx" ON "CatalogVariant"("productId");
CREATE INDEX "CatalogVariant_active_stock_idx" ON "CatalogVariant"("active", "stock");

ALTER TABLE "CatalogVariant"
  ADD CONSTRAINT "CatalogVariant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

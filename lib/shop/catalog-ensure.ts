import type { PrismaClient } from "@prisma/client";
import { CATALOG_SEED, FOUNDER_SEED } from "./catalog-seed";

export async function ensureCatalogWith(db: PrismaClient) {
  for (const row of [...CATALOG_SEED, FOUNDER_SEED]) {
    const product = await db.catalogProduct.upsert({
      where: { slug: row.product.slug },
      update: {},
      create: {
        slug: row.product.slug,
        name: row.product.name,
        nameHi: row.product.nameHi,
        description: row.product.description,
        descriptionHi: row.product.descriptionHi,
        needsNfc: row.product.needsNfc,
        needsDesign: row.product.needsDesign,
        defaultTemplateId: row.product.defaultTemplateId,
        sortOrder: row.product.sortOrder ?? 0
      }
    });
    for (const variant of row.variants) {
      await db.catalogVariant.upsert({
        where: { sku: variant.sku },
        update: {},
        create: { ...variant, productId: product.id }
      });
    }
  }
}

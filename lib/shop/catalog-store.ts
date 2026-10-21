import { prisma } from "@/lib/db";
import {
  catalogProductError,
  catalogVariantError,
  type BundleTier,
  type CatalogProductInput,
  type CatalogVariantInput
} from "./catalog";
import { ensureCatalogWith } from "./catalog-ensure";

export async function ensureCatalog() {
  await ensureCatalogWith(prisma);
}

export async function listCatalog() {
  await ensureCatalog();
  return prisma.catalogProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { variants: { orderBy: { sku: "asc" } } }
  });
}

export async function createCatalogProduct(product: CatalogProductInput, variant: CatalogVariantInput) {
  const productError = catalogProductError(product);
  if (productError) return { ok: false as const, error: productError };
  const variantError = catalogVariantError(variant);
  if (variantError) return { ok: false as const, error: variantError };
  const created = await prisma.catalogProduct.create({
    data: {
      slug: product.slug,
      name: product.name.trim(),
      nameHi: product.nameHi?.trim() || null,
      description: product.description.trim(),
      descriptionHi: product.descriptionHi?.trim() || null,
      needsNfc: product.needsNfc,
      needsDesign: product.needsDesign,
      defaultTemplateId: product.defaultTemplateId || null,
      sortOrder: product.sortOrder ?? 0,
      active: product.active ?? true,
      variants: { create: cleanVariant(variant) }
    },
    include: { variants: true }
  });
  return { ok: true as const, product: created };
}

export async function updateCatalogProduct(id: string, product: Partial<CatalogProductInput>) {
  const current = await prisma.catalogProduct.findUnique({ where: { id } });
  if (!current) return { ok: false as const, error: "Product not found" };
  const next: CatalogProductInput = {
    slug: product.slug ?? current.slug,
    name: product.name ?? current.name,
    nameHi: product.nameHi === undefined ? current.nameHi : product.nameHi,
    description: product.description ?? current.description,
    descriptionHi: product.descriptionHi === undefined ? current.descriptionHi : product.descriptionHi,
    needsNfc: product.needsNfc ?? current.needsNfc,
    needsDesign: product.needsDesign ?? current.needsDesign,
    defaultTemplateId: product.defaultTemplateId === undefined ? current.defaultTemplateId : product.defaultTemplateId,
    active: product.active ?? current.active,
    sortOrder: product.sortOrder ?? current.sortOrder
  };
  const error = catalogProductError(next);
  if (error) return { ok: false as const, error };
  const saved = await prisma.catalogProduct.update({
    where: { id },
    data: {
      slug: next.slug,
      name: next.name.trim(),
      nameHi: next.nameHi?.trim() || null,
      description: next.description.trim(),
      descriptionHi: next.descriptionHi?.trim() || null,
      needsNfc: next.needsNfc,
      needsDesign: next.needsDesign,
      defaultTemplateId: next.defaultTemplateId || null,
      active: next.active ?? true,
      sortOrder: next.sortOrder ?? 0
    }
  });
  return { ok: true as const, product: saved };
}

export async function addCatalogVariant(productId: string, variant: CatalogVariantInput) {
  const product = await prisma.catalogProduct.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { ok: false as const, error: "Product not found" };
  const error = catalogVariantError(variant);
  if (error) return { ok: false as const, error };
  const saved = await prisma.catalogVariant.create({ data: { ...cleanVariant(variant), productId } });
  return { ok: true as const, variant: saved };
}

export async function updateCatalogVariant(id: string, patch: Partial<CatalogVariantInput>) {
  const current = await prisma.catalogVariant.findUnique({ where: { id } });
  if (!current) return { ok: false as const, error: "Variant not found" };
  const next: CatalogVariantInput = {
    sku: patch.sku ?? current.sku,
    name: patch.name ?? current.name,
    nameHi: patch.nameHi === undefined ? current.nameHi : patch.nameHi,
    costPaise: patch.costPaise ?? current.costPaise,
    mrpPaise: patch.mrpPaise ?? current.mrpPaise,
    salePaise: patch.salePaise ?? current.salePaise,
    hsn: patch.hsn ?? current.hsn,
    gstPercent: patch.gstPercent ?? current.gstPercent,
    weightGrams: patch.weightGrams ?? current.weightGrams,
    lengthMm: patch.lengthMm ?? current.lengthMm,
    widthMm: patch.widthMm ?? current.widthMm,
    heightMm: patch.heightMm ?? current.heightMm,
    stock: patch.stock ?? current.stock,
    lowStockAt: patch.lowStockAt ?? current.lowStockAt,
    minQty: patch.minQty ?? current.minQty,
    imageUrl: patch.imageUrl === undefined ? current.imageUrl : patch.imageUrl,
    active: patch.active ?? current.active,
    includedTier: patch.includedTier === undefined ? bundleTierOrNull(current.includedTier) : patch.includedTier,
    includedMonths: patch.includedMonths === undefined ? current.includedMonths : patch.includedMonths,
    includedLifetime: patch.includedLifetime ?? current.includedLifetime,
    ships: patch.ships ?? current.ships
  };
  const error = catalogVariantError(next);
  if (error) return { ok: false as const, error };
  const saved = await prisma.catalogVariant.update({ where: { id }, data: cleanVariant(next) });
  return { ok: true as const, variant: saved };
}

function bundleTierOrNull(value: string | null): BundleTier | null {
  if (value === "STARTER" || value === "GROWTH" || value === "AGENCY" || value === "FOUNDER") return value;
  return null;
}

function cleanVariant(variant: CatalogVariantInput) {
  return {
    sku: variant.sku,
    name: variant.name.trim(),
    nameHi: variant.nameHi?.trim() || null,
    costPaise: variant.costPaise,
    mrpPaise: variant.mrpPaise,
    salePaise: variant.salePaise,
    hsn: variant.hsn,
    gstPercent: variant.gstPercent,
    weightGrams: variant.weightGrams,
    lengthMm: variant.lengthMm,
    widthMm: variant.widthMm,
    heightMm: variant.heightMm,
    stock: variant.stock,
    lowStockAt: variant.lowStockAt,
    minQty: variant.minQty,
    imageUrl: variant.imageUrl || null,
    active: variant.active ?? true,
    includedTier: variant.includedTier ?? null,
    includedMonths: variant.includedMonths ?? null,
    includedLifetime: variant.includedLifetime === true,
    ships: variant.ships !== false
  };
}

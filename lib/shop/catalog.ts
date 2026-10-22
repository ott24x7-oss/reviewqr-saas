/** QR24x7 hardware catalogue rules. Prices are GST-inclusive paise. */

export const BUNDLE_TIERS = ["STARTER", "GROWTH", "AGENCY", "FOUNDER"] as const;
export type BundleTier = (typeof BUNDLE_TIERS)[number];
export const BUNDLE_MONTHS = [1, 6, 12] as const;

export type CatalogVariantInput = {
  sku: string;
  name: string;
  nameHi?: string | null;
  costPaise: number;
  mrpPaise: number;
  salePaise: number;
  hsn: string;
  gstPercent: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  stock: number;
  lowStockAt: number;
  minQty: number;
  imageUrl?: string | null;
  active?: boolean;
  includedTier?: BundleTier | null;
  includedMonths?: number | null;
  includedLifetime?: boolean;
  /** False for a digital plan SKU. Weight and box may then be zero. */
  ships?: boolean;
};

export type CatalogProductInput = {
  slug: string;
  name: string;
  nameHi?: string | null;
  description: string;
  descriptionHi?: string | null;
  needsNfc: boolean;
  needsDesign: boolean;
  defaultTemplateId?: string | null;
  active?: boolean;
  sortOrder?: number;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const HSN = /^\d{4,8}$/;

export function isLowStock(stock: number, lowStockAt: number) {
  return stock <= lowStockAt;
}

export function catalogVariantError(input: CatalogVariantInput): string | null {
  if (!SKU.test(input.sku)) return "SKU uses uppercase letters, digits, and hyphens";
  if (!input.name.trim()) return "Variant name is required";
  if (!Number.isInteger(input.costPaise) || input.costPaise < 0) return "Cost must be zero or more paise";
  if (!Number.isInteger(input.salePaise) || input.salePaise <= 0) return "Sale price must be a positive number of paise";
  if (!Number.isInteger(input.mrpPaise) || input.mrpPaise < input.salePaise) return "MRP must be at least the sale price";
  if (!HSN.test(input.hsn)) return "HSN must be 4 to 8 digits";
  if (!Number.isInteger(input.gstPercent) || input.gstPercent < 0 || input.gstPercent > 28) return "GST percent must be from 0 to 28";
  const ships = input.ships !== false;
  if (!Number.isInteger(input.weightGrams) || input.weightGrams < 0 || (ships && input.weightGrams <= 0)) {
    return "Weight must be a positive number of grams";
  }
  const boxOk = [input.lengthMm, input.widthMm, input.heightMm].every((n) => Number.isInteger(n) && (ships ? n > 0 : n >= 0));
  if (!boxOk) return ships ? "Box dimensions must be positive millimetres" : "Box dimensions cannot be negative";
  const bundleError = bundleFieldError(input);
  if (bundleError) return bundleError;
  if (!Number.isInteger(input.stock) || input.stock < 0) return "Stock cannot be negative";
  if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0) return "Low-stock level cannot be negative";
  if (!Number.isInteger(input.minQty) || input.minQty < 1) return "Minimum order quantity is at least 1";
  if (input.imageUrl && !input.imageUrl.startsWith("data:image/") && !input.imageUrl.startsWith("https://")) {
    return "Image must be an uploaded data URL or an https URL";
  }
  return null;
}

function bundleFieldError(input: CatalogVariantInput): string | null {
  const lifetime = input.includedLifetime === true;
  const months = input.includedMonths ?? null;
  const tier = input.includedTier ?? null;
  if (lifetime && months != null) return "A lifetime bundle does not also grant months";
  if (lifetime && tier && tier !== "FOUNDER") return "Lifetime bundles use the Founder tier";
  if (lifetime && months == null) return null;
  if (!lifetime && months == null && !tier) return null;
  if (!lifetime && months == null) return "A bundled plan needs 1, 6, or 12 months";
  if (months != null && !BUNDLE_MONTHS.includes(months as (typeof BUNDLE_MONTHS)[number])) {
    return "Bundled months are 1, 6, or 12";
  }
  if (!tier || !BUNDLE_TIERS.includes(tier)) return "A bundled plan needs a tier";
  return null;
}

export function catalogProductError(input: CatalogProductInput): string | null {
  if (!SLUG.test(input.slug)) return "Slug uses lowercase letters, digits, and hyphens";
  if (!input.name.trim() || !input.description.trim()) return "Name and description are required";
  return null;
}

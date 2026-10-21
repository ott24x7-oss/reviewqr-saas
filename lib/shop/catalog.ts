/** ReviewQR hardware catalogue rules. Prices are GST-inclusive paise. */

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
  if (!Number.isInteger(input.weightGrams) || input.weightGrams <= 0) return "Weight must be a positive number of grams";
  if ([input.lengthMm, input.widthMm, input.heightMm].some((n) => !Number.isInteger(n) || n <= 0)) {
    return "Box dimensions must be positive millimetres";
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) return "Stock cannot be negative";
  if (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 0) return "Low-stock level cannot be negative";
  if (!Number.isInteger(input.minQty) || input.minQty < 1) return "Minimum order quantity is at least 1";
  if (input.imageUrl && !input.imageUrl.startsWith("data:image/") && !input.imageUrl.startsWith("https://")) {
    return "Image must be an uploaded data URL or an https URL";
  }
  return null;
}

export function catalogProductError(input: CatalogProductInput): string | null {
  if (!SLUG.test(input.slug)) return "Slug uses lowercase letters, digits, and hyphens";
  if (!input.name.trim() || !input.description.trim()) return "Name and description are required";
  return null;
}

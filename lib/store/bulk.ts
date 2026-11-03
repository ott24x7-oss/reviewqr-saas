import ExcelJS from "exceljs";
import type { MenuItemKind, PriceType } from "@prisma/client";
import { BULK_COLUMNS, BULK_COLUMN_NOTES, normalizeVeg, parseCsv, rowsFromTable, type EntryRow } from "./entry";

export type BulkAction = "add" | "update" | "skip";

export function defaultBulkAction(matched: boolean, duplicateInFile: boolean, mode: "add_new" | "update_existing"): BulkAction {
  if (duplicateInFile) return "skip";
  if (matched) return mode === "update_existing" ? "update" : "skip";
  return "add";
}
export type BulkPreviewRow = {
  index: number;
  row: EntryRow;
  errors: string[];
  warnings: string[];
  matchedItemId: string | null;
  action: BulkAction;
};

export function demoRowsForBusiness(industry?: string | null): EntryRow[] {
  const text = (industry || "").toLowerCase();
  const food = /cafe|café|restaurant|bakery|sweet|food/.test(text);
  const services = /salon|clinic|gym|tutor|spa|beauty/.test(text);
  const raw: Array<[string, string, string, string, string, string, string, string, string, string, string, string, string]> = food
    ? [
        ["Masala chai", "40", "", "Tea", "मसाला चाय", "Fresh ginger and cardamom tea", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Filter coffee", "80", "", "Coffee", "फ़िल्टर कॉफ़ी", "South Indian filter coffee", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Paneer tikka", "220", "", "Starters", "पनीर टिक्का", "Char-grilled paneer with spices", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Veg biryani", "190", "", "Mains", "वेज बिरयानी", "Basmati rice with vegetables", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Chicken curry", "260", "", "Mains", "चिकन करी", "Homestyle chicken curry", "NON_VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Gulab jamun", "90", "", "Dessert", "गुलाब जामुन", "Two warm syrup-soaked sweets", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Fresh lime soda", "75", "", "Drinks", "नींबू सोडा", "Sweet or salted", "VEG", "", "", "PRODUCT", "", "yes", ""],
        ["Chocolate brownie", "130", "", "Dessert", "चॉकलेट ब्राउनी", "Warm brownie with chocolate", "EGG", "", "", "PRODUCT", "", "yes", ""]
      ]
    : services
      ? [
          ["Haircut", "350", "", "Hair", "हेयरकट", "Wash and style included", "", "", "", "SERVICE", "45", "yes", ""],
          ["Hair wash", "250", "", "Hair", "हेयर वॉश", "Shampoo and conditioning", "", "", "", "SERVICE", "30", "yes", ""],
          ["Hair colouring", "1800", "", "Hair", "हेयर कलर", "Root touch-up or full colour", "", "", "", "SERVICE", "120", "yes", ""],
          ["Facial", "1200", "", "Skin", "फेशियल", "Cleanse, exfoliate and moisturise", "", "", "", "SERVICE", "60", "yes", ""],
          ["Manicure", "650", "", "Nails", "मैनीक्योर", "Nail shaping and polish", "", "", "", "SERVICE", "45", "yes", ""],
          ["Pedicure", "850", "", "Nails", "पेडीक्योर", "Foot care and polish", "", "", "", "SERVICE", "60", "yes", ""],
          ["Head massage", "500", "", "Wellness", "हेड मसाज", "Relaxing scalp massage", "", "", "", "SERVICE", "30", "yes", ""],
          ["Bridal styling", "", "", "Packages", "ब्राइडल स्टाइलिंग", "Consultation and event styling", "", "", "", "SERVICE", "180", "yes", ""]
        ]
      : [
          ["Basmati rice 1 kg", "125", "", "Grocery", "बासमती चावल 1 किलो", "Premium long-grain rice", "VEG", "Daily Harvest", "890100000001", "PRODUCT", "", "yes", ""],
          ["Toor dal 1 kg", "145", "", "Grocery", "तूर दाल 1 किलो", "Unpolished pigeon peas", "VEG", "Daily Harvest", "890100000002", "PRODUCT", "", "yes", ""],
          ["Sunflower oil 1 L", "165", "180", "Cooking oil", "सूरजमुखी तेल 1 लीटर", "Refined cooking oil", "VEG", "SunDrop", "890100000003", "PRODUCT", "", "yes", ""],
          ["Whole wheat atta 5 kg", "245", "", "Grocery", "गेहूँ का आटा 5 किलो", "Stone-ground whole wheat", "VEG", "Daily Harvest", "890100000004", "PRODUCT", "", "yes", ""],
          ["Masala chai 250 g", "110", "", "Tea", "मसाला चाय 250 ग्राम", "Tea blended with warming spices", "VEG", "Chai House", "890100000005", "PRODUCT", "", "yes", ""],
          ["Bath soap", "45", "55", "Personal care", "नहाने का साबुन", "Moisturising bathing bar", "", "FreshLeaf", "890100000006", "PRODUCT", "", "yes", ""],
          ["Dishwash liquid 500 ml", "95", "", "Home care", "बर्तन धोने का लिक्विड 500 मिली", "Lemon dishwashing liquid", "", "CleanDrop", "890100000007", "PRODUCT", "", "yes", ""],
          ["Toothpaste 150 g", "125", "", "Personal care", "टूथपेस्ट 150 ग्राम", "Mint fluoride toothpaste", "", "BrightSmile", "890100000008", "PRODUCT", "", "yes", ""]
        ];
  return raw.map((values) => Object.fromEntries(BULK_COLUMNS.map((key, i) => [key, values[i] || ""])) as Record<string, string>)
    .map((value) => ({
      name: value.name, price: value.price, mrp: value.mrp, category: value.category,
      nameHi: value.hindi_name, description: value.description, veg: value.veg, brand: value.brand,
      barcode: value.barcode, kind: value.kind, durationMinutes: value.duration_minutes,
      available: value.available, imageUrl: value.image_url, colour: "", photo: ""
    }));
}

export function csvForRows(rows: EntryRow[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const record = (values: string[]) => values.map(escape).join(",");
  return "\uFEFF" + [
    record([...BULK_COLUMNS]),
    ...rows.map((row) => record([
      row.name, row.price, row.mrp, row.category, row.nameHi, row.description, row.veg,
      row.brand, row.barcode, row.kind, row.durationMinutes, row.available, row.imageUrl
    ]))
  ].join("\r\n") + "\r\n";
}

export async function xlsxForRows(rows: EntryRow[], includeNotes: boolean) {
  const workbook = new ExcelJS.Workbook();
  const products = workbook.addWorksheet("Products");
  products.addRow([...BULK_COLUMNS]);
  for (const row of rows) products.addRow([
    row.name, row.price ? Number(row.price) : "", row.mrp ? Number(row.mrp) : "", row.category,
    row.nameHi, row.description, row.veg, row.brand, row.barcode, row.kind,
    row.durationMinutes ? Number(row.durationMinutes) : "", row.available, row.imageUrl
  ]);
  products.views = [{ state: "frozen", ySplit: 1 }];
  products.getRow(1).font = { bold: true };
  products.columns = BULK_COLUMNS.map((key) => ({ header: key, width: Math.max(16, key.length + 4) }));
  if (includeNotes) {
    const notes = workbook.addWorksheet("How to fill");
    notes.addRow(["Column", "English", "हिन्दी"]);
    notes.getRow(1).font = { bold: true };
    for (const note of BULK_COLUMN_NOTES) notes.addRow([note.key, note.en, note.hi]);
    notes.columns = [{ width: 24 }, { width: 52 }, { width: 52 }];
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function excelCellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value) return excelCellText(value.result as ExcelJS.CellValue);
  }
  return "";
}

export async function parseBulkFile(bytes: Buffer, fileName: string): Promise<EntryRow[]> {
  if (/\.csv$/i.test(fileName)) return parseCsv(bytes.toString("utf8"));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet("Products") || workbook.worksheets[0];
  if (!sheet) throw new Error("That workbook has no Products sheet");
  const table: string[][] = [];
  sheet.eachRow((row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    table.push(values.map((value) => excelCellText(value as ExcelJS.CellValue)));
  });
  return rowsFromTable(table);
}

export function validateBulkRow(row: EntryRow) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!row.name.trim()) errors.push("Missing name");
  else if (row.name.trim().length > 120) errors.push("Name must be 120 characters or fewer");
  if (row.price.trim()) {
    const price = Number(row.price);
    if (!/^\d+(?:\.\d{1,2})?$/.test(row.price.trim()) || !Number.isFinite(price) || price < 0 || price > 100000) errors.push("Price must be a rupee amount from 0 to 100000");
  } else warnings.push("No price: item will use price on request");
  if (row.mrp.trim() && (!/^\d+(?:\.\d{1,2})?$/.test(row.mrp.trim()) || Number(row.mrp) < 0 || Number(row.mrp) > 100000)) errors.push("MRP must be a rupee amount from 0 to 100000");
  if (!normalizeVeg(row.veg)) errors.push("Veg must be VEG, NON_VEG, EGG, or blank");
  const kind = row.kind.trim().toUpperCase();
  if (kind && kind !== "PRODUCT" && kind !== "SERVICE") errors.push("Kind must be PRODUCT or SERVICE");
  if (row.durationMinutes.trim() && (!/^\d+$/.test(row.durationMinutes.trim()) || Number(row.durationMinutes) < 1 || Number(row.durationMinutes) > 1440)) errors.push("Duration must be 1–1440 minutes");
  if (kind === "SERVICE" && !row.durationMinutes.trim()) warnings.push("Service has no duration");
  if (row.available.trim() && !/^(yes|no|true|false|1|0)$/i.test(row.available.trim())) errors.push("Available must be yes or no");
  if (row.brand.trim().length > 40) errors.push("Brand must be 40 characters or fewer");
  if (row.barcode.trim().length > 64) errors.push("Barcode must be 64 characters or fewer");
  if (row.description.length > 2000) errors.push("Description must be 2000 characters or fewer");
  if (row.imageUrl.trim()) {
    if (row.imageUrl.trim().length > 2048) errors.push("Image URL is too long");
    try {
      const url = new URL(row.imageUrl.trim());
      if (url.protocol !== "https:") errors.push("Image URL must use HTTPS");
    } catch { errors.push("Image URL is invalid"); }
  }
  return { errors, warnings };
}

export function buildBulkPreview(rows: EntryRow[], existing: Array<{ id: string; name: string; barcode: string }>, used: number, cap: number, existingCategories: string[] = []): {
  rows: BulkPreviewRow[]; newCategories: string[]; limit: { used: number; cap: number; remaining: number; additions: number; fits: number };
} {
  const seenNames = new Set<string>();
  const categories = new Set<string>();
  const matched = (row: EntryRow) => {
    const barcode = row.barcode.trim();
    if (barcode) {
      const byBarcode = existing.find((item) => item.barcode && item.barcode === barcode);
      if (byBarcode) return byBarcode;
    }
    return existing.find((item) => item.name.trim().toLowerCase() === row.name.trim().toLowerCase());
  };
  const preview = rows.map((row, index) => {
    const { errors, warnings } = validateBulkRow(row);
    const key = row.name.trim().toLowerCase();
    const duplicateInFile = !!key && seenNames.has(key);
    if (duplicateInFile) warnings.push("Duplicate name in this file");
    if (key) seenNames.add(key);
    const item = matched(row);
    if (item) warnings.push(`Existing item “${item.name}” matches by name or barcode`);
    if (row.category.trim()) categories.add(row.category.trim());
    return { index, row, errors, warnings, matchedItemId: item?.id || null, action: (duplicateInFile ? "skip" : item ? "update" : "add") as BulkAction };
  });
  const remaining = Math.max(0, cap - used);
  let additions = 0;
  let fits = 0;
  let fittedAdditions = 0;
  for (const item of preview) {
    if (item.errors.length) continue;
    if (item.action === "add") {
      additions++;
      if (fittedAdditions < remaining) { fittedAdditions++; fits++; }
    } else if (item.action === "update") fits++;
  }
  return { rows: preview, newCategories: [...categories].filter((name) => !existingCategories.some((existingName) => existingName.toLowerCase() === name.toLowerCase())), limit: { used, cap, remaining, additions, fits } };
}

export function normalizeBulkItem(row: EntryRow): {
  kind: MenuItemKind; priceType: PriceType; pricePaise: number; mrpPaise: number | null;
  durationMinutes: number | null; available: boolean;
} {
  const kind = (row.kind.trim().toUpperCase() || (row.durationMinutes.trim() ? "SERVICE" : "PRODUCT")) as MenuItemKind;
  const priceType: PriceType = row.price.trim() ? "FIXED" : "ON_REQUEST";
  const pricePaise = row.price.trim() ? Math.round(Number(row.price) * 100) : 0;
  return {
    kind, priceType, pricePaise,
    mrpPaise: row.mrp.trim() ? Math.round(Number(row.mrp) * 100) : null,
    durationMinutes: row.durationMinutes.trim() ? Number(row.durationMinutes) : null,
    available: !/^(no|false|0)$/i.test(row.available.trim())
  };
}

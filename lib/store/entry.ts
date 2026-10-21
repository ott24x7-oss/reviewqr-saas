/** Pure helpers for fast product entry. No database and no AI calls. */

export const VEG_MARKS = ["VEG", "NON_VEG", "EGG", "NONE"] as const;
export type VegMark = (typeof VEG_MARKS)[number];

export type EntryRow = {
  name: string;
  price: string;
  category: string;
  nameHi: string;
  description: string;
  veg: string;
  brand: string;
  mrp: string;
  colour: string;
  photo: string;
  barcode: string;
};

export type ProductDraft = {
  name: string;
  category: string;
  description: string;
  veg: VegMark;
  brand: string;
  colour: string;
  durationMinutes: number | null;
};

const HEADER_MAP: Record<string, keyof EntryRow> = {
  name: "name",
  price: "price",
  category: "category",
  "hindi name": "nameHi",
  hindi: "nameHi",
  description: "description",
  veg: "veg",
  brand: "brand",
  mrp: "mrp",
  colour: "colour",
  color: "colour",
  barcode: "barcode",
  photo: "photo"
};

export function blankRow(): EntryRow {
  return {
    name: "",
    price: "",
    category: "",
    nameHi: "",
    description: "",
    veg: "",
    brand: "",
    mrp: "",
    colour: "",
    photo: "",
    barcode: ""
  };
}

/** Empty becomes NONE. Anything outside the four marks is rejected. */
export function normalizeVeg(value: string): VegMark | null {
  const text = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!text) return "NONE";
  if (text === "VEG" || text === "NON_VEG" || text === "EGG" || text === "NONE") return text;
  return null;
}

export function rowError(row: EntryRow): string {
  if (!row.name.trim()) return "Missing name";
  if (!/^\d+(?:\.\d+)?$/.test(row.price.trim())) return "Price is not a number";
  const price = Number(row.price);
  if (!Number.isFinite(price) || price < 0 || price > 100000) return "Price is not a number";
  if (normalizeVeg(row.veg) === null) return "Veg mark must be VEG, NON_VEG, EGG, or NONE";
  if (row.mrp.trim() && !/^\d+(?:\.\d+)?$/.test(row.mrp.trim())) return "MRP is not a number";
  return "";
}

/** How many valid rows one save may write, and how many are left over. */
export function takeForSave(count: number, used: number, limit: number, cap = 50) {
  const room = Math.max(0, limit - Math.max(0, used));
  const take = Math.max(0, Math.min(count, room, cap));
  return { take, skipped: Math.max(0, count - take) };
}

/** Obvious "Name 120" pieces. Commas and new lines separate items. No price is left out. */
export function splitPastedItems(text: string): EntryRow[] {
  const rows: EntryRow[] = [];
  for (const part of text.split(/[\n,]/)) {
    const match = part.trim().match(/^(.*\S)\s+(?:₹|rs\.?)?\s*(\d{1,6}(?:\.\d{1,2})?)$/i);
    if (!match) continue;
    const name = match[1].replace(/^[-–:]+\s*/, "").trim();
    if (!/[a-z]/i.test(name)) continue;
    const price = Number(match[2]);
    if (!Number.isFinite(price) || price > 100000) continue;
    const row = blankRow();
    row.name = name.slice(0, 80);
    row.price = String(price);
    rows.push(row);
    if (rows.length === 50) break;
  }
  return rows;
}

export function rowsFromTable(table: string[][]): EntryRow[] {
  if (!table.length) return [];
  const first = table[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = first.includes("name") && (first.includes("price") || first.includes("mrp"));
  const header = hasHeader ? first : ["name", "price", "category", "hindi name", "description", "veg", "brand", "mrp"];
  const body = hasHeader ? table.slice(1) : table;
  return body
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => {
      const row = blankRow();
      header.forEach((key, index) => {
        const field = HEADER_MAP[key];
        if (field) row[field] = (cells[index] || "").trim();
      });
      return row;
    });
}

/** In-app CSV. Quoted commas stay in one cell. */
export function parseCsv(text: string): EntryRow[] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      table.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    table.push(row);
  }
  return rowsFromTable(table);
}

export function templateCsv() {
  return (
    "\uFEFFname,price,category,Hindi name,description,veg,brand,MRP\n" +
    "Filter coffee,80,Coffee,फ़िल्टर कॉफ़ी,South Indian coffee,VEG,,\n"
  );
}

function readJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/[\[{][\s\S]*[\]}]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** One product from a model reply. A price in the reply is ignored. */
export function readProductDraft(raw: string): ProductDraft | null {
  const data = readJson(raw);
  const root = asRecord(data);
  const record =
    root && typeof root.name === "string"
      ? root
      : root && Array.isArray(root.items)
        ? asRecord(root.items[0])
        : Array.isArray(data)
          ? asRecord(data[0])
          : null;
  if (!record) return null;
  const name = String(record.name || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
  if (!name) return null;
  const minutes = Number(record.durationMinutes);
  return {
    name,
    category: String(record.category || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80),
    description: String(record.description || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200),
    veg: normalizeVeg(String(record.veg || "")) || "NONE",
    brand: String(record.brand || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40),
    colour: String(record.colour || record.color || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40),
    durationMinutes: Number.isFinite(minutes) && minutes >= 1 && minutes <= 480 ? Math.round(minutes) : null
  };
}

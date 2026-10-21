export type MenuDraftItem = {
  name: string;
  priceRupees: number;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
};

function priceOf(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const price = Number(match[0]);
  return Number.isFinite(price) ? price : null;
}

function vegOf(value: unknown): MenuDraftItem["veg"] {
  const text = String(value || "").toUpperCase().replace(/[\s-]+/g, "_");
  if (text.includes("NON") || text.includes("CHICKEN") || text.includes("MEAT")) return "NON_VEG";
  if (text.includes("EGG")) return "EGG";
  if (text === "VEG" || text.includes("VEGETARIAN")) return "VEG";
  return "NONE";
}

/** Pulls menu rows out of a model reply. Bad JSON becomes an empty list. */
export function parseMenuDraft(raw: string): MenuDraftItem[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/[\[{][\s\S]*[\]}]/);
    if (!match) return [];
    try {
      data = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : [];
  const items: MenuDraftItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as { name?: unknown; priceRupees?: unknown; price?: unknown; veg?: unknown };
    const name = String(record.name || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
    const price = priceOf(record.priceRupees ?? record.price);
    if (!name || price === null || price < 0 || price > 100000) continue;
    items.push({ name, priceRupees: Math.round(price * 100) / 100, veg: vegOf(record.veg) });
    if (items.length === 50) break;
  }
  return items;
}

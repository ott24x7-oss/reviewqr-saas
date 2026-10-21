export const INACTIVE_AFTER_MS = 60 * 24 * 60 * 60 * 1000;

/** Inactive when the last consented order is older than 60 days. No order is not inactive. */
export function isInactive(lastOrderAt: Date | string | null | undefined, now = new Date()) {
  if (!lastOrderAt) return false;
  const time = lastOrderAt instanceof Date ? lastOrderAt : new Date(lastOrderAt);
  if (Number.isNaN(time.getTime())) return false;
  return now.getTime() - time.getTime() > INACTIVE_AFTER_MS;
}

/** Comma-separated tags. Duplicates and blanks are dropped. */
export function parseTags(value: string) {
  const tags: string[] = [];
  for (const part of value.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase())) continue;
    tags.push(tag);
    if (tags.length === 8) break;
  }
  return tags;
}

export type CustomerCsvRow = {
  name: string;
  phone: string;
  orders: number;
  spendPaise: number;
  lastOrder: string;
  tags: string[];
  inactive: boolean;
};

function cell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function customersCsv(rows: CustomerCsvRow[]) {
  const header = ["name", "phone", "orders", "spend", "last order", "tags", "inactive"];
  const lines = rows.map((row) => {
    const rupees = (row.spendPaise / 100).toFixed(2);
    return [
      cell(row.name),
      cell(row.phone),
      String(row.orders),
      rupees,
      cell(row.lastOrder),
      cell(row.tags.join(", ")),
      row.inactive ? "yes" : "no"
    ].join(",");
  });
  return `\uFEFF${[header.join(","), ...lines].join("\n")}\n`;
}

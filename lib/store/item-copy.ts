export type ItemCopyField = "description" | "nameHi";

/** Reads one suggested field from a model JSON reply. Throws when the text is unusable. */
export function readItemCopy(raw: string, field: ItemCopyField): string {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No usable text");
    data = JSON.parse(match[0]);
  }
  if (!data || typeof data !== "object") throw new Error("No usable text");
  const record = data as Record<string, unknown>;
  const value = String(record[field] || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const max = field === "description" ? 200 : 80;
  const text = value.slice(0, max).trim();
  if (text.length < 2) throw new Error("No usable text");
  return text;
}

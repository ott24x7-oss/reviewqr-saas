export type VCardInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  url?: string | null;
  note?: string | null;
};

function escapeVCard(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/[\\,;]/g, (char) => `\\${char}`);
}

/** vCard 3.0 text. Callers send only the business's own public fields. */
export function buildVCard(input: VCardInput) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(input.name)}`];
  const phone = (input.phone || "").replace(/[^\d+]/g, "");
  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
  if (input.address || input.city || input.pincode) {
    lines.push(
      `ADR;TYPE=WORK:;;${escapeVCard(input.address || "")};${escapeVCard(input.city || "")};;${escapeVCard(input.pincode || "")};`
    );
  }
  if (input.url && input.url.startsWith("https://")) lines.push(`URL:${escapeVCard(input.url)}`);
  if (input.note) lines.push(`NOTE:${escapeVCard(input.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export type OrderLine = {
  name: string;
  qty: number;
  unitPaise: number;
  note?: string;
};

export type OrderMessageInput = {
  businessName: string;
  lines: OrderLine[];
  tableOrAddress?: string;
  customerName?: string;
  note?: string;
  hindi?: boolean;
};

const URL_LIMIT = 1800;

export function formatRupees(paise: number) {
  const rupees = paise / 100;
  const body = Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
  return `₹${body}`;
}

export function lineTotalPaise(line: OrderLine) {
  return Math.max(0, Math.round(line.unitPaise)) * Math.max(0, Math.round(line.qty));
}

function clip(value: string | undefined, max: number) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text || max <= 0) return "";
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function buildOrderText(input: OrderMessageInput, noteLimit = 80) {
  const title = input.hindi
    ? `नया ऑर्डर — ${input.businessName}`
    : `New order — ${input.businessName}`;
  const rows = input.lines.map((line, index) => {
    const note = clip(line.note, noteLimit);
    const suffix = note ? `  (${input.hindi ? "नोट" : "Note"}: ${note})` : "";
    return `${index + 1}. ${line.name} × ${line.qty} — ${formatRupees(lineTotalPaise(line))}${suffix}`;
  });
  const total = input.lines.reduce((sum, line) => sum + lineTotalPaise(line), 0);
  const place = clip(input.tableOrAddress, 80);
  const name = clip(input.customerName, 40);
  const who = [place && `${input.hindi ? "टेबल" : "Table"}: ${place}`, name && `${input.hindi ? "नाम" : "Name"}: ${name}`]
    .filter(Boolean)
    .join(" | ");
  const orderNote = clip(input.note, noteLimit);
  const lines = [
    title,
    ...rows,
    `${input.hindi ? "कुल" : "Total"}: ${formatRupees(total)}`,
    who,
    orderNote && `${input.hindi ? "नोट" : "Note"}: ${orderNote}`
  ].filter(Boolean);
  return lines.join("\n");
}

export function whatsAppHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Shrinks notes until the full wa.me URL fits. Item notes go first, then the order note. */
export function fitWhatsAppOrder(phone: string, input: OrderMessageInput, limit = URL_LIMIT) {
  let noteLimit = 80;
  let text = buildOrderText(input, noteLimit);
  let url = whatsAppHref(phone, text);
  while (url.length > limit && noteLimit > 0) {
    noteLimit -= 10;
    text = buildOrderText(input, noteLimit);
    url = whatsAppHref(phone, text);
  }
  if (url.length > limit) {
    text = buildOrderText({ ...input, note: "", lines: input.lines.map((line) => ({ ...line, note: "" })) }, 0);
    url = whatsAppHref(phone, text);
  }
  return { text, url, truncated: noteLimit < 80 };
}

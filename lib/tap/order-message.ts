export type OrderLine = {
  name: string;
  qty: number;
  unitPaise: number;
  note?: string;
};

export type OrderCharges = {
  subtotalPaise: number;
  discountPaise?: number;
  deliveryPaise?: number;
  packingPaise?: number;
  gstPaise?: number;
  pricesIncludeGst?: boolean;
  totalPaise: number;
  orderForLater?: boolean;
  prepMinutes?: number;
  orderType?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  pincode?: string;
};

export type OrderMessageInput = {
  businessName: string;
  lines: OrderLine[];
  tableOrAddress?: string;
  customerName?: string;
  note?: string;
  hindi?: boolean;
  charges?: OrderCharges;
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
  const placeLabel = input.charges?.orderType === "DELIVERY"
    ? (input.hindi ? "पता" : "Address")
    : input.charges?.orderType === "TAKEAWAY"
      ? (input.hindi ? "पार्सल" : "Takeaway")
      : (input.hindi ? "टेबल" : "Table");
  const who = [place && `${placeLabel}: ${place}`, name && `${input.hindi ? "नाम" : "Name"}: ${name}`]
    .filter(Boolean)
    .join(" | ");
  const orderNote = clip(input.note, noteLimit);
  const charges = input.charges;
  const moneyLines = charges
    ? [
        `${input.hindi ? "सामान" : "Subtotal"}: ${formatRupees(charges.subtotalPaise)}`,
        charges.discountPaise ? `${input.hindi ? "छूट" : "Discount"}: ${formatRupees(charges.discountPaise)}` : "",
        charges.packingPaise ? `${input.hindi ? "पैकिंग" : "Packing"}: ${formatRupees(charges.packingPaise)}` : "",
        charges.deliveryPaise ? `${input.hindi ? "डिलीवरी" : "Delivery"}: ${formatRupees(charges.deliveryPaise)}` : "",
        charges.gstPaise
          ? `${charges.pricesIncludeGst === false ? "GST" : input.hindi ? "GST शामिल" : "GST included"}: ${formatRupees(charges.gstPaise)}`
          : "",
        `${input.hindi ? "कुल" : "Total"}: ${formatRupees(charges.totalPaise)}`,
        charges.orderForLater ? (input.hindi ? "बाद के लिए ऑर्डर" : "Order for later") : "",
        charges.prepMinutes ? (input.hindi ? `लगभग ${charges.prepMinutes} मिनट में तैयार` : `Ready in about ${charges.prepMinutes} min`) : "",
        charges.pincode ? `${input.hindi ? "पिनकोड" : "Pincode"}: ${charges.pincode}` : ""
      ]
    : [`${input.hindi ? "कुल" : "Total"}: ${formatRupees(total)}`];
  const lines = [
    title,
    ...rows,
    ...moneyLines,
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

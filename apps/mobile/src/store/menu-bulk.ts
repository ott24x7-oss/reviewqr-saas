export type BulkMode = "add_new" | "update_existing";
export type BulkAction = "add" | "update" | "skip";

export type MobileBulkRow = {
  index: number;
  row: Record<string, string>;
  errors: string[];
  warnings: string[];
  matchedItemId: string | null;
  action: BulkAction;
};

export type MobileBulkPreview = {
  rows: MobileBulkRow[];
  newCategories: string[];
  limit: { used: number; cap: number; remaining: number; additions: number; fits: number };
};

export function menuBulkFileSpec(businessId: string, kind: "template" | "demo", format: "csv" | "xlsx") {
  const path = `/api/v1/businesses/${encodeURIComponent(businessId)}/menu/sheet?format=${format}&kind=${kind}`;
  return {
    path,
    filename: `qr24x7-items-${kind}.${format}`,
    mimeType: format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    uti: format === "csv" ? "public.comma-separated-values-text" : "org.openxmlformats.spreadsheetml.sheet"
  };
}

export function arrayBufferToBase64(input: ArrayBuffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = new Uint8Array(input);
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    encoded += second === undefined ? "=" : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    encoded += third === undefined ? "=" : alphabet[third & 63];
  }
  return encoded;
}

export function mapBulkPreview(input: unknown): MobileBulkPreview {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rows = Array.isArray(value.rows) ? value.rows : [];
  const limitValue = value.limit && typeof value.limit === "object" ? value.limit as Record<string, unknown> : {};
  return {
    rows: rows.map((raw, index) => {
      const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const item = row.row && typeof row.row === "object" ? row.row as Record<string, unknown> : {};
      const action = row.action === "update" || row.action === "skip" ? row.action : "add";
      return {
        index: Number.isInteger(row.index) ? Number(row.index) : index,
        row: Object.fromEntries(Object.entries(item).map(([key, cell]) => [key, String(cell ?? "")])),
        errors: Array.isArray(row.errors) ? row.errors.map(String) : [],
        warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
        matchedItemId: typeof row.matchedItemId === "string" ? row.matchedItemId : null,
        action
      };
    }),
    newCategories: Array.isArray(value.newCategories) ? value.newCategories.map(String) : [],
    limit: {
      used: Number(limitValue.used) || 0, cap: Number(limitValue.cap) || 0,
      remaining: Number(limitValue.remaining) || 0, additions: Number(limitValue.additions) || 0,
      fits: Number(limitValue.fits) || 0
    }
  };
}

export function bulkResultCopy(result: { created: number; updated: number; skipped: number; failed: number; noPhoto: number }, lang: "en" | "hi") {
  if (lang === "hi") return `${result.created} जोड़े · ${result.updated} अपडेट · ${result.skipped} छोड़े · ${result.failed} विफल। ${result.noPhoto} आइटम में फ़ोटो नहीं है।`;
  return `${result.created} added · ${result.updated} updated · ${result.skipped} skipped · ${result.failed} failed. ${result.noPhoto} items have no photo.`;
}

const ISSUE_HI: Record<string, string> = {
  "Missing name": "नाम ज़रूरी है",
  "Name must be 120 characters or fewer": "नाम 120 अक्षरों से छोटा होना चाहिए",
  "No price: item will use price on request": "कीमत नहीं है: आइटम पूछने पर कीमत दिखाएगा",
  "Price must be a rupee amount from 0 to 100000": "कीमत रुपये में 0 से 100000 के बीच होनी चाहिए",
  "MRP must be a rupee amount from 0 to 100000": "एमआरपी रुपये में 0 से 100000 के बीच होनी चाहिए",
  "Veg must be VEG, NON_VEG, EGG, or blank": "Veg में VEG, NON_VEG, EGG या खाली रखें",
  "Kind must be PRODUCT or SERVICE": "Kind में PRODUCT या SERVICE रखें",
  "Duration must be 1–1440 minutes": "अवधि 1 से 1440 मिनट के बीच होनी चाहिए",
  "Service has no duration": "सेवा की अवधि नहीं दी गई है",
  "Available must be yes or no": "Available में yes या no रखें",
  "Image URL must use HTTPS": "फोटो लिंक HTTPS होना चाहिए",
  "Image URL is invalid": "फोटो लिंक सही नहीं है",
  "Image URL is too long": "फोटो लिंक बहुत लंबा है",
  "Image must be PNG, JPEG, or WebP": "फ़ोटो PNG, JPEG या WebP होनी चाहिए",
  "Duplicate name in this file": "इस फ़ाइल में नाम दोहराया गया है",
  "Choose a file under 2 MB": "2 MB से छोटी फ़ाइल चुनें",
  "Choose between 1 and 500 preview rows": "1 से 500 पंक्तियाँ चुनें",
  "Select at least one valid row to import": "इम्पोर्ट के लिए कम से कम एक सही पंक्ति चुनें",
  "The file has no item rows": "फ़ाइल में आइटम की पंक्तियाँ नहीं हैं",
  "Too many bulk imports. Try again later.": "बहुत ज़्यादा बल्क इम्पोर्ट हुए हैं। बाद में कोशिश करें।"
};

export function localizeBulkIssue(message: string, lang: "en" | "hi") {
  if (lang !== "hi") return message;
  if (ISSUE_HI[message]) return ISSUE_HI[message];
  if (message.startsWith("Existing item ")) return "मौजूदा आइटम का नाम या बारकोड मेल खाता है";
  if (message.startsWith("Image URL:")) return `फोटो लिंक सुरक्षित नहीं है: ${message.slice("Image URL:".length).trim()}`;
  if (message.includes("private/reserved")) return "फ़ोटो लिंक निजी या सुरक्षित न होने वाले पते पर जाता है";
  if (message.includes("Image download failed")) return "फ़ोटो लिंक से फ़ाइल डाउनलोड नहीं हुई";
  return message;
}

const URI_PREFIX = [
  "",
  "http://www.",
  "https://www.",
  "http://",
  "https://",
  "tel:",
  "mailto:"
];

export function nfcUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/t/${code}?src=nfc`;
}

/** Public site origin for a tag. Missing or unparseable config stays empty. */
export function publicAppOrigin(appUrl: string | undefined) {
  const raw = (appUrl || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function nfcLinkMatches(value: string, code: string) {
  return value.includes(`/t/${code}`) && value.includes("src=nfc");
}

/** NFC Forum URI prefix byte, then the rest of the URL. */
export function decodeNdefUrl(bytes: Uint8Array) {
  if (bytes.length === 0) return "";
  const prefix = bytes[0] < URI_PREFIX.length ? URI_PREFIX[bytes[0]] : "";
  return prefix + new TextDecoder().decode(bytes.subarray(1));
}

export function normalizeChipUid(value: string) {
  const uid = value.trim().toLowerCase();
  if (/^[0-9a-f]{2}(?::[0-9a-f]{2}){1,10}$/.test(uid)) return uid;
  if (/^[0-9a-f]{8,20}$/.test(uid)) return uid;
  return null;
}

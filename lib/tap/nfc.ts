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

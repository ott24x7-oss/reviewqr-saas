const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(length = 8) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const CODE = /^[A-Z0-9]{4,16}$/;

export function normalizeCode(value: string | null | undefined) {
  const code = (value || "").trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

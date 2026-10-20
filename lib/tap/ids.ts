import { customAlphabet } from "nanoid";

/** No 0/O or 1/I, so a printed code is easy to type. 32 symbols. */
export const QR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 12 symbols from a 32-character alphabet is 60 bits. */
export const QR_ID_LENGTH = 12;

const generate = customAlphabet(QR_ALPHABET, QR_ID_LENGTH);

export function makeQrPublicId() {
  return generate();
}

/** New stock codes. Existing 8-character codes stay valid in the database. */
export function isGeneratedQrId(value: string, length = QR_ID_LENGTH) {
  if (value.length !== length) return false;
  for (const char of value) {
    if (!QR_ALPHABET.includes(char)) return false;
  }
  return true;
}

/** Anything we will look up. Includes older codes such as DEMO-CNTR. */
export function isLookupCode(value: string) {
  return /^[A-Za-z0-9_-]{4,32}$/.test(value);
}

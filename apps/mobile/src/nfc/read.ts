/** Decode an NDEF URI payload. A bad record returns an empty string. */
export function readUriPayload(
  decode: (data: Uint8Array) => string,
  payload: number[] | undefined
) {
  if (!payload?.length) return "";
  try {
    return decode(new Uint8Array(payload));
  } catch {
    return "";
  }
}

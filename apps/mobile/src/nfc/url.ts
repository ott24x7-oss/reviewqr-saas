/** Absolute tap URL written onto an NTAG. `src=nfc` keeps taps separate from scans. */
export function nfcTapUrl(origin: string, publicPath: string) {
  const base = origin.replace(/\/$/, "");
  const path = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  const glue = path.includes("?") ? "&" : "?";
  return `${base}${path}${glue}src=nfc`;
}

/** True when a read-back contains this tap code and the NFC source. */
export function nfcPayloadMatches(payload: string, publicPath: string) {
  const code = publicPath.split("/t/")[1]?.split(/[?#/]/)[0];
  if (!code) return false;
  return payload.includes(`/t/${code}`) && payload.includes("src=nfc");
}

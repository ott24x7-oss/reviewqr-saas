export type ScanSource = "qr" | "nfc" | "link";

/** /q with no src counts as a QR scan. /t with no src counts as NFC. */
export function scanSource(channel: "q" | "t", src: string | null | undefined): ScanSource {
  if (src === "qr" || src === "nfc" || src === "link") return src;
  return channel === "t" ? "nfc" : "qr";
}

import type { PrintTemplate } from "./templates";
import { MIN_QR_MM } from "./qr-check";

export function fitQrMm(template: PrintTemplate, requested?: number) {
  const safeW = Math.max(0, template.widthMm - template.safeMm * 2);
  const safeH = Math.max(0, template.heightMm - template.safeMm * 2);
  const maxFit = Math.min(safeW, safeH);
  if (maxFit <= 0) return 0;
  const landscape = template.shape === "rect" && template.widthMm > template.heightMm * 1.1;
  const target = landscape ? Math.min(safeH * 0.92, safeW * 0.48) : Math.min(maxFit * 0.62, 70);
  const preferred = maxFit >= MIN_QR_MM ? Math.min(maxFit, Math.max(MIN_QR_MM, target)) : maxFit;
  const wanted = requested == null || !Number.isFinite(requested) ? preferred : Math.min(maxFit, Math.max(8, requested));
  // The face layout may shrink the QR so it never overlaps text; size checks use that real size.
  return faceLayout(template, wanted).qr.size;
}

export type Slot = { x: number; y: number; size: number; maxWidth: number };

export type FaceLayout = {
  landscape: boolean;
  qr: { x: number; y: number; size: number };
  name: Slot;
  cta: Slot;
  ctaHi: Slot;
  stars: { x: number; y: number; size: number };
  nfc: { x: number; y: number; size: number };
  label: Slot;
};

/** Gap kept clear between the QR plate and any text, stars or the NFC row. */
const QR_CLEAR_MM = 1.5;

/** Positions from the trim top-left, in millimetres. Nothing may overlap the QR box. */
export function faceLayout(template: PrintTemplate, qrMm: number): FaceLayout {
  const pad = template.safeMm;
  const landscape = template.shape === "rect" && template.widthMm > template.heightMm * 1.1;
  let nameSize = Math.min(4.6, template.heightMm * 0.09);
  let ctaSize = Math.min(3.2, nameSize * 0.72);
  const nfc = { x: pad, y: template.heightMm - pad - 5.2, size: 5 };
  const starsFor = (cta: number) => Math.min(3.4, cta + 0.4);
  const GAPS = 1.3 + 1 + 1.4;
  if (!landscape) {
    // On small pieces (keychain, small stickers) shrink the text stack, down to 55%,
    // so the QR keeps at least the minimum printable size without overlapping text.
    // Independent of the requested QR size, so fitQrMm(fitQrMm(x)) is stable.
    const room = nfc.y - QR_CLEAR_MM * 2 - pad - GAPS - MIN_QR_MM;
    const baseName = nameSize;
    const baseCta = ctaSize;
    let f = 1;
    while (f > 0.55 && baseName * f + baseCta * f * 2 + starsFor(baseCta * f) > room) f -= 0.01;
    nameSize = baseName * Math.max(0.55, f);
    ctaSize = baseCta * Math.max(0.55, f);
  }

  let qr: { x: number; y: number; size: number };
  if (landscape) {
    const size = Math.min(qrMm, template.heightMm - pad * 2);
    qr = { x: template.widthMm - pad - size, y: (template.heightMm - size) / 2, size };
  } else {
    // Text stack first (name, CTA, Hindi CTA, stars), then the QR in the space left above the NFC row.
    const textBottom = pad + nameSize + ctaSize * 2 + starsFor(ctaSize) + GAPS;
    const top = textBottom + QR_CLEAR_MM;
    const bottom = nfc.y - QR_CLEAR_MM;
    const size = Math.max(0, Math.min(qrMm, bottom - top, template.widthMm - pad * 2));
    qr = { x: (template.widthMm - size) / 2, y: top + (bottom - top - size) / 2, size };
  }

  const textW = landscape ? Math.max(8, qr.x - pad - 2) : template.widthMm - pad * 2;
  let y = pad;
  const name = { x: pad, y, size: nameSize, maxWidth: textW };
  y += nameSize + 1.3;
  const cta = { x: pad, y, size: ctaSize, maxWidth: textW };
  y += ctaSize + 1;
  const ctaHi = { x: pad, y, size: ctaSize, maxWidth: textW };
  y += ctaSize + 1.4;
  const stars = { x: pad, y, size: starsFor(ctaSize) };
  const labelSize = 2.6;
  const label = {
    x: pad + nfc.size + 1.4,
    y: nfc.y + (nfc.size - labelSize) / 2,
    size: labelSize,
    maxWidth: Math.max(8, (landscape ? textW : template.widthMm - pad * 2) - nfc.size - 1.4)
  };
  return { landscape, qr, name, cta, ctaHi, stars, nfc, label };
}

export function backLayout(template: PrintTemplate) {
  const pad = template.safeMm;
  const name = {
    x: pad,
    y: template.heightMm / 2 - 8,
    size: Math.min(5, template.heightMm * 0.1),
    maxWidth: template.widthMm - pad * 2
  };
  return {
    name,
    line: { x: pad, y: name.y + name.size + 2, size: 3.2, maxWidth: name.maxWidth }
  };
}

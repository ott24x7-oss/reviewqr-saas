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
  if (requested == null || !Number.isFinite(requested)) return preferred;
  return Math.min(maxFit, Math.max(8, requested));
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

/** Positions from the trim top-left, in millimetres. */
export function faceLayout(template: PrintTemplate, qrMm: number): FaceLayout {
  const pad = template.safeMm;
  const landscape = template.shape === "rect" && template.widthMm > template.heightMm * 1.1;
  const qr = landscape
    ? { x: template.widthMm - pad - qrMm, y: (template.heightMm - qrMm) / 2, size: qrMm }
    : {
        x: (template.widthMm - qrMm) / 2,
        y: Math.max(pad, template.heightMm - pad - qrMm - 8),
        size: qrMm
      };
  const textW = landscape ? Math.max(8, qr.x - pad - 2) : template.widthMm - pad * 2;
  const nameSize = Math.min(4.6, template.heightMm * 0.09);
  const ctaSize = Math.min(3.2, nameSize * 0.72);
  let y = pad;
  const name = { x: pad, y, size: nameSize, maxWidth: textW };
  y += nameSize + 1.3;
  const cta = { x: pad, y, size: ctaSize, maxWidth: textW };
  y += ctaSize + 1;
  const ctaHi = { x: pad, y, size: ctaSize, maxWidth: textW };
  y += ctaSize + 1.4;
  const stars = { x: pad, y, size: Math.min(3.4, ctaSize + 0.4) };
  const nfc = { x: pad, y: template.heightMm - pad - 5.2, size: 5 };
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

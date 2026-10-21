/** 1 inch = 25.4 mm = 72 PDF points. */
export const MM_PER_IN = 25.4;
export const PT_PER_IN = 72;
export const BLEED_MM = 3;

export function inToMm(inches: number) {
  return inches * MM_PER_IN;
}

export function mmToPt(mm: number) {
  return (mm * PT_PER_IN) / MM_PER_IN;
}

export function bleedBox(widthMm: number, heightMm: number, bleedMm = BLEED_MM) {
  return {
    bleedMm,
    widthMm: widthMm + bleedMm * 2,
    heightMm: heightMm + bleedMm * 2
  };
}

/** Safe content sits this far inside the trim. The keychain is too small for 4 mm. */
export function safeInsetMm(templateId: string) {
  return templateId === "keychain" ? 2 : 4;
}

export function safeBox(widthMm: number, heightMm: number, insetMm: number) {
  return {
    x: insetMm,
    y: insetMm,
    widthMm: widthMm - insetMm * 2,
    heightMm: heightMm - insetMm * 2
  };
}

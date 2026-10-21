import QRCode from "qrcode";
import { contrastRatio, relativeLuminance } from "../tap/contrast";

export const QUIET_MODULES = 4;
export const MIN_QR_MM = 20;
export const MIN_QR_CONTRAST = 4;
/** Centre logo covers this fraction of the QR width. Error correction stays H. */
export const LOGO_WIDTH_FRACTION = 0.18;

export type CellKind = "quiet" | "eye" | "logo" | "data";

export type QrMatrix = {
  size: number;
  errorCorrection: "H";
  dark(row: number, col: number): boolean;
};

export function createQrMatrix(text: string): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  if (qr.errorCorrectionLevel.bit !== 2) {
    throw new Error("QR error correction must be H");
  }
  return {
    size: qr.modules.size,
    errorCorrection: "H",
    dark(row: number, col: number) {
      return qr.modules.get(row, col) === 1;
    }
  };
}

export function isFinder(row: number, col: number, size: number) {
  const hit = (row0: number, col0: number) => row >= row0 && row < row0 + 7 && col >= col0 && col < col0 + 7;
  return hit(0, 0) || hit(0, size - 7) || hit(size - 7, 0);
}

export function logoBox(size: number) {
  const span = Math.max(1, Math.round(size * LOGO_WIDTH_FRACTION));
  const start = Math.floor((size - span) / 2);
  return { row: start, col: start, span };
}

export function cellKind(row: number, col: number, size: number, logo: boolean): CellKind {
  if (logo) {
    const box = logoBox(size);
    if (row >= box.row && row < box.row + box.span && col >= box.col && col < box.col + box.span) return "logo";
  }
  if (isFinder(row, col, size)) return "eye";
  return "data";
}

/** x/y include the quiet zone. (0,0) is the outer top-left module. */
export function outerCellKind(x: number, y: number, size: number, logo: boolean): CellKind {
  if (x < QUIET_MODULES || y < QUIET_MODULES || x >= size + QUIET_MODULES || y >= size + QUIET_MODULES) return "quiet";
  return cellKind(y - QUIET_MODULES, x - QUIET_MODULES, size, logo);
}

export function outerModules(size: number) {
  return size + QUIET_MODULES * 2;
}

export type QrInk = {
  dark: string;
  /** Second stop. Omit for a flat module colour. */
  darkTo?: string;
  light: string;
};

export type QrInkCheck = {
  /** Contrast and polarity. A small QR is still printable; `tooSmall` is only a warning. */
  ok: boolean;
  contrastOk: boolean;
  polarityOk: boolean;
  tooSmall: boolean;
  ratio: number | null;
};

function stopsOf(ink: QrInk) {
  return ink.darkTo ? [ink.dark, ink.darkTo] : [ink.dark];
}

/** Dark modules must be darker than the light ground, and at least 4:1 against it. */
export function checkQrInk(ink: QrInk, printMm: number): QrInkCheck {
  const lightL = relativeLuminance(ink.light);
  let contrastOk = true;
  let polarityOk = true;
  let ratio: number | null = null;
  for (const stop of stopsOf(ink)) {
    const value = contrastRatio(stop, ink.light);
    const darkL = relativeLuminance(stop);
    if (value == null || value + 1e-9 < MIN_QR_CONTRAST) contrastOk = false;
    if (darkL == null || lightL == null || !(darkL < lightL)) polarityOk = false;
    if (value != null) ratio = ratio == null ? value : Math.min(ratio, value);
  }
  return {
    ok: contrastOk && polarityOk,
    contrastOk,
    polarityOk,
    tooSmall: !(printMm >= MIN_QR_MM),
    ratio
  };
}

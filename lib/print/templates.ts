import { inToMm, safeInsetMm } from "./units";

export type DeviceKindName = "CARD" | "STANDEE" | "STICKER" | "KEYCHAIN";

export type PrintTemplate = {
  id: string;
  name: string;
  /** Trim width. Round stickers use the diameter. */
  widthMm: number;
  heightMm: number;
  shape: "rect" | "round";
  faces: 1 | 2;
  kind: DeviceKindName;
  safeMm: number;
};

export type SheetSize = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
};

const piece = (
  id: string,
  name: string,
  widthMm: number,
  heightMm: number,
  shape: PrintTemplate["shape"],
  faces: 1 | 2,
  kind: DeviceKindName
): PrintTemplate => ({
  id,
  name,
  widthMm,
  heightMm,
  shape,
  faces,
  kind,
  safeMm: safeInsetMm(id)
});

export const PRINT_TEMPLATES: PrintTemplate[] = [
  piece("cr80", "PVC card CR80", 85.6, 54, "rect", 2, "CARD"),
  piece("tent-a6", "Table tent A6", 105, 148, "rect", 1, "STANDEE"),
  piece("tent-a5", "Table tent A5", 148, 210, "rect", 1, "STANDEE"),
  piece("standee-4x6", "Acrylic standee 4×6 in", inToMm(4), inToMm(6), "rect", 1, "STANDEE"),
  piece("standee-5x7", "Acrylic standee 5×7 in", inToMm(5), inToMm(7), "rect", 1, "STANDEE"),
  piece("round-50", "Round sticker 50 mm", 50, 50, "round", 1, "STICKER"),
  piece("round-75", "Round sticker 75 mm", 75, 75, "round", 1, "STICKER"),
  piece("square-60", "Square sticker 60 mm", 60, 60, "rect", 1, "STICKER"),
  piece("square-100", "Square sticker 100 mm", 100, 100, "rect", 1, "STICKER"),
  piece("poster-a4", "Counter poster A4", 210, 297, "rect", 1, "STANDEE"),
  piece("poster-a3", "Counter poster A3", 297, 420, "rect", 1, "STANDEE"),
  piece("bill-strip", "Bill strip", 80, 140, "rect", 1, "STANDEE"),
  piece("keychain", "Keychain tag", 30, 50, "rect", 1, "KEYCHAIN"),
  piece("door", "Door sticker", 120, 180, "rect", 1, "STICKER")
];

export const SHEETS: SheetSize[] = [
  { id: "a4", name: "A4", widthMm: 210, heightMm: 297 },
  { id: "a3", name: "A3", widthMm: 297, heightMm: 420 },
  { id: "sra3", name: "SRA3", widthMm: 320, heightMm: 450 },
  { id: "12x18", name: "12×18 in", widthMm: 304.8, heightMm: 457.2 }
];

export function templateById(id: string) {
  return PRINT_TEMPLATES.find((item) => item.id === id) || null;
}

export function sheetById(id: string) {
  return SHEETS.find((item) => item.id === id) || null;
}

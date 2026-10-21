import { checkQrInk } from "./qr-check";
import { needsRaster } from "./text";
import { templateById, type PrintTemplate } from "./templates";
import { fitQrMm } from "./layout";

export class PrintInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "PrintInputError";
  }
}

export type ModuleStyle = "square" | "rounded" | "dots";
export type EyeStyle = "square" | "rounded" | "circle";
export type PrintPreset = "exact" | "bleed" | "sheet";
export type PrintFormat = "pdf" | "svg" | "zip";
export type RasterId = "name" | "cta" | "cta-hi" | "back-name" | "back-line";

export type PrintRaster = {
  id: RasterId;
  bytes: Uint8Array;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type PrintDesign = {
  templateId: string;
  name: string;
  cta: string;
  ctaHi: string;
  backLine: string;
  background: string;
  backgroundTo?: string;
  foreground: string;
  qrDark: string;
  qrDarkTo?: string;
  qrLight: string;
  module: ModuleStyle;
  eye: EyeStyle;
  showNfc: boolean;
  showStars: boolean;
  qrMm?: number;
  logo?: Uint8Array;
  backgroundImage?: Uint8Array;
  rasters: PrintRaster[];
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function colour(value: string, label: string) {
  if (!HEX.test(value)) throw new PrintInputError(`${label} must be a #rrggbb colour`);
}

export function assertPrintable(design: PrintDesign, template: PrintTemplate, qrMm: number) {
  colour(design.background, "Background");
  colour(design.foreground, "Text");
  colour(design.qrDark, "QR");
  colour(design.qrLight, "QR background");
  if (design.backgroundTo) colour(design.backgroundTo, "Background");
  if (design.qrDarkTo) colour(design.qrDarkTo, "QR");
  const ink = checkQrInk(
    { dark: design.qrDark, darkTo: design.qrDarkTo, light: design.qrLight },
    qrMm
  );
  if (!ink.polarityOk) throw new PrintInputError("QR modules must be darker than the light background");
  if (!ink.contrastOk) throw new PrintInputError("QR contrast is too low");
  const raster = (id: RasterId) => design.rasters.some((item) => item.id === id);
  if (needsRaster(design.name) && !raster("name")) {
    throw new PrintInputError("Send a raster image for the business name");
  }
  if (needsRaster(design.cta) && !raster("cta")) {
    throw new PrintInputError("Send a raster image for the call to action");
  }
  if (design.ctaHi.trim() && !raster("cta-hi")) {
    throw new PrintInputError("Send a raster image for Hindi text");
  }
  if (template.faces === 2 && needsRaster(design.name) && !raster("back-name")) {
    throw new PrintInputError("Send a raster image for the name on the back");
  }
  if (template.faces === 2 && needsRaster(design.backLine) && !raster("back-line")) {
    throw new PrintInputError("Send a raster image for the back line");
  }
  for (const image of design.rasters) {
    if (image.bytes.length > 1_500_000) throw new PrintInputError("Image is too large");
    if (![image.xMm, image.yMm, image.widthMm, image.heightMm].every((n) => Number.isFinite(n))) {
      throw new PrintInputError("Raster placement is invalid");
    }
  }
  return ink.tooSmall ? "QR prints smaller than 20 mm" : null;
}

export function resolveTemplate(id: string) {
  const template = templateById(id);
  if (!template) throw new PrintInputError("Choose a print template");
  return template;
}

export function resolvedQrMm(template: PrintTemplate, requested?: number) {
  return fitQrMm(template, requested);
}

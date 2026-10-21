import { z } from "zod";
import { PrintInputError, type PrintDesign } from "./design";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const printDesignSchema = z.object({
  templateId: z.string().min(1).max(40),
  preset: z.enum(["exact", "bleed", "sheet"]),
  sheetId: z.string().max(20).optional(),
  format: z.enum(["pdf", "svg", "zip"]),
  name: z.string().max(80).default(""),
  cta: z.string().max(120).default(""),
  ctaHi: z.string().max(120).default(""),
  backLine: z.string().max(80).default("Tap the other side"),
  background: hex,
  backgroundTo: hex.optional(),
  foreground: hex,
  qrDark: hex,
  qrDarkTo: hex.optional(),
  qrLight: hex,
  module: z.enum(["square", "rounded", "dots"]),
  eye: z.enum(["square", "rounded", "circle"]),
  showNfc: z.boolean().default(true),
  showStars: z.boolean().default(true),
  qrMm: z.number().positive().max(200).optional(),
  logo: z.string().max(2_200_000).optional(),
  backgroundImage: z.string().max(2_200_000).optional(),
  rasters: z
    .array(
      z.object({
        id: z.enum(["name", "cta", "cta-hi", "back-name", "back-line"]),
        data: z.string().min(16).max(2_200_000),
        xMm: z.number(),
        yMm: z.number(),
        widthMm: z.number().positive(),
        heightMm: z.number().positive()
      })
    )
    .max(8)
    .default([])
});

export const printExportSchema = printDesignSchema.extend({
  codes: z.array(z.object({ code: z.string().min(4).max(32), label: z.string().max(80).default("") })).min(1).max(100)
});

const printedCode = z.object({
  code: z.string().min(4).max(32),
  label: z.string().max(80).default("")
});

export const printBatchSchema = printDesignSchema.extend({
  count: z.number().int().min(1).max(100)
});

export const ownerPrintSchema = printDesignSchema
  .extend({
    count: z.number().int().min(1).max(100).optional(),
    codes: z.array(printedCode).max(100).optional()
  })
  .refine((data) => Boolean(data.count) || Boolean(data.codes && data.codes.length > 0), {
    message: "Choose codes"
  });

export function imageBytes(value: string | undefined) {
  if (!value) return undefined;
  const raw = value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length < 8 || bytes.length > 1_500_000) throw new PrintInputError("Image is too large");
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!png && !jpg) throw new PrintInputError("Use a PNG or JPEG image");
  return new Uint8Array(bytes);
}

export function designFromBody(data: z.infer<typeof printDesignSchema>): PrintDesign {
  return {
    templateId: data.templateId,
    name: data.name,
    cta: data.cta,
    ctaHi: data.ctaHi,
    backLine: data.backLine,
    background: data.background,
    backgroundTo: data.backgroundTo,
    foreground: data.foreground,
    qrDark: data.qrDark,
    qrDarkTo: data.qrDarkTo,
    qrLight: data.qrLight,
    module: data.module,
    eye: data.eye,
    showNfc: data.showNfc,
    showStars: data.showStars,
    qrMm: data.qrMm,
    logo: imageBytes(data.logo),
    backgroundImage: imageBytes(data.backgroundImage),
    rasters: data.rasters.map((item) => ({
      id: item.id,
      bytes: imageBytes(item.data) || new Uint8Array(),
      xMm: item.xMm,
      yMm: item.yMm,
      widthMm: item.widthMm,
      heightMm: item.heightMm
    }))
  };
}

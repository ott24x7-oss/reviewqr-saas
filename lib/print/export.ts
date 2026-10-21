import { isLookupCode } from "../tap/ids";
import { PrintInputError, assertPrintable, resolvedQrMm, resolveTemplate, type PrintDesign, type PrintFormat, type PrintPreset } from "./design";
import { impose } from "./impose";
import { scenesToPdf } from "./pdf";
import { buildPrintScenes } from "./scene";
import { sheetById } from "./templates";
import { sceneToSvg } from "./svg";
import { zipFiles } from "./zip";

export type PrintCode = { code: string; label: string };

function codeUrl(code: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/q/${code}?src=qr`;
}

export async function exportPrint(input: {
  design: PrintDesign;
  preset: PrintPreset;
  sheetId?: string;
  format: PrintFormat;
  codes: PrintCode[];
}) {
  if (input.codes.length < 1 || input.codes.length > 100) {
    throw new PrintInputError("Choose between 1 and 100 codes");
  }
  for (const item of input.codes) {
    if (!isLookupCode(item.code)) throw new PrintInputError("Enter a valid QR code");
  }
  const template = resolveTemplate(input.design.templateId);
  const sheet = input.preset === "sheet" ? sheetById(input.sheetId || "") : null;
  if (input.preset === "sheet" && !sheet) throw new PrintInputError("Choose a sheet size");
  if (sheet) {
    const fit = impose({
      itemWidthMm: template.widthMm,
      itemHeightMm: template.heightMm,
      sheetWidthMm: sheet.widthMm,
      sheetHeightMm: sheet.heightMm
    });
    if (fit.count < 1) throw new PrintInputError("This piece does not fit on that sheet");
  }
  const qrMm = resolvedQrMm(template, input.design.qrMm);
  const warning = assertPrintable(input.design, template, qrMm);
  const scenes = buildPrintScenes({
    design: input.design,
    template,
    preset: input.preset,
    sheet,
    qrMm,
    codes: input.codes.map((item) => ({ code: item.code, label: item.label, url: codeUrl(item.code) }))
  });
  if (input.format === "svg" && scenes.length === 1) {
    return {
      body: Buffer.from(sceneToSvg(scenes[0])),
      contentType: "image/svg+xml",
      filename: `${template.id}.svg`,
      warning
    };
  }
  if (input.format === "svg") {
    const body = zipFiles(scenes.map((scene, index) => ({
      name: `${template.id}-${String(index + 1).padStart(2, "0")}.svg`,
      data: Buffer.from(sceneToSvg(scene))
    })));
    return { body, contentType: "application/zip", filename: `${template.id}-svg.zip`, warning };
  }
  const pdf = await scenesToPdf(scenes);
  if (input.format === "zip") {
    const body = zipFiles([{ name: `${template.id}.pdf`, data: pdf }]);
    return { body, contentType: "application/zip", filename: `${template.id}.zip`, warning };
  }
  return { body: Buffer.from(pdf), contentType: "application/pdf", filename: `${template.id}.pdf`, warning };
}

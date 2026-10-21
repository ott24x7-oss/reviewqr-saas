import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/utils";

function ink(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111111";
}

function winAnsi(value: string) {
  const text = value.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim();
  return text || "Store";
}

/** One page. The image encodes /<slug>/store. */
export async function storePosterPdf(slug: string, name: string) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const url = absoluteUrl(`/${slug}/store`);
  const png = await QRCode.toBuffer(url, {
    margin: 1,
    width: 512,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" }
  });
  const image = await doc.embedPng(png);
  const page = doc.addPage([420, 640]);
  page.drawText(winAnsi(name).slice(0, 42), { x: 36, y: 580, size: 22, font, color: rgb(0.07, 0.07, 0.07) });
  page.drawText("Scan to order", { x: 36, y: 548, size: 14, font: body, color: rgb(0.25, 0.25, 0.25) });
  page.drawImage(image, { x: 70, y: 210, width: 280, height: 280 });
  page.drawText(`/${slug}/store`, { x: 36, y: 160, size: 12, font: body, color: rgb(0.25, 0.25, 0.25) });
  return doc.save();
}

/** One page per code. The image encodes /q/<code>?src=qr. */
export async function qrSheetPdf(codes: string[], color = "#111111") {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const dark = ink(color);
  for (const code of codes) {
    const url = absoluteUrl(`/q/${code}?src=qr`);
    const png = await QRCode.toBuffer(url, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: "H",
      color: { dark, light: "#ffffff" }
    });
    const image = await doc.embedPng(png);
    const page = doc.addPage([420, 560]);
    page.drawImage(image, { x: 70, y: 180, width: 280, height: 280 });
    page.drawText(code, { x: 70, y: 130, size: 18, font, color: rgb(0.07, 0.07, 0.07) });
    const path = `/q/${code}?src=qr`;
    page.drawText(path, { x: 70, y: 100, size: 11, font, color: rgb(0.25, 0.25, 0.25) });
  }
  return doc.save();
}

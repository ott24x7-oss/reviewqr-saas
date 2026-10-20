import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/utils";

function ink(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111111";
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

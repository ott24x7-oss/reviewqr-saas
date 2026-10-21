import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { hexRgb } from "./color";
import { PrintInputError } from "./design";
import type { Scene, Shape } from "./scene";
import { mmToPt } from "./units";

function paint(hex: string) {
  const channels = hexRgb(hex) || [17, 17, 17];
  return rgb(channels[0] / 255, channels[1] / 255, channels[2] / 255);
}

function isPng(bytes: Uint8Array) {
  return bytes[0] === 0x89 && bytes[1] === 0x50;
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

function roundedRect(page: PDFPage, x: number, y: number, w: number, h: number, radius: number, fill: ReturnType<typeof paint>) {
  const r = Math.min(radius, w / 2, h / 2);
  if (r <= 0.2) {
    page.drawRectangle({ x, y, width: w, height: h, color: fill });
    return;
  }
  page.drawRectangle({ x: x + r, y, width: w - r * 2, height: h, color: fill });
  page.drawRectangle({ x, y: y + r, width: w, height: h - r * 2, color: fill });
  page.drawCircle({ x: x + r, y: y + r, size: r, color: fill });
  page.drawCircle({ x: x + w - r, y: y + r, size: r, color: fill });
  page.drawCircle({ x: x + r, y: y + h - r, size: r, color: fill });
  page.drawCircle({ x: x + w - r, y: y + h - r, size: r, color: fill });
}

async function drawShape(
  doc: PDFDocument,
  page: PDFPage,
  shape: Shape,
  font: PDFFont,
  bold: PDFFont,
  images: Map<Uint8Array, Awaited<ReturnType<PDFDocument["embedPng"]>>>
) {
  const pageH = page.getHeight();
  const yOf = (mm: number) => pageH - mmToPt(mm);
  if (shape.kind === "rect") {
    const x = mmToPt(shape.x);
    const y = yOf(shape.y + shape.h);
    const w = mmToPt(shape.w);
    const h = mmToPt(shape.h);
    if (shape.fill) roundedRect(page, x, y, w, h, mmToPt(shape.radius || 0), paint(shape.fill));
    if (shape.stroke) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: paint(shape.stroke),
        borderWidth: mmToPt(0.15),
        opacity: 0,
        borderOpacity: 1
      });
    }
    return;
  }
  if (shape.kind === "circle") {
    page.drawCircle({ x: mmToPt(shape.cx), y: yOf(shape.cy), size: mmToPt(shape.r), color: paint(shape.fill) });
    return;
  }
  if (shape.kind === "line") {
    page.drawLine({
      start: { x: mmToPt(shape.x1), y: yOf(shape.y1) },
      end: { x: mmToPt(shape.x2), y: yOf(shape.y2) },
      thickness: mmToPt(shape.width),
      color: paint(shape.stroke)
    });
    return;
  }
  if (shape.kind === "polygon") {
    const d = shape.points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${mmToPt(point.x)} ${yOf(point.y)}`)
      .join(" ");
    page.drawSvgPath(`${d} Z`, { color: paint(shape.fill) });
    return;
  }
  if (shape.kind === "text") {
    const face = shape.bold ? bold : font;
    const text = shape.text.replace(/[^\x20-\x7e]/g, "").trim();
    if (!text) return;
    let size = mmToPt(shape.size);
    const max = shape.maxWidth ? mmToPt(shape.maxWidth) : null;
    if (max) {
      while (size > 4 && face.widthOfTextAtSize(text, size) > max) size -= 0.25;
    }
    page.drawText(text, { x: mmToPt(shape.x), y: yOf(shape.y) - size, size, font: face, color: paint(shape.fill) });
    return;
  }
  let image = images.get(shape.bytes);
  if (!image) {
    if (isPng(shape.bytes)) image = await doc.embedPng(shape.bytes);
    else if (isJpeg(shape.bytes)) image = await doc.embedJpg(shape.bytes);
    else throw new PrintInputError("Use a PNG or JPEG image");
    images.set(shape.bytes, image);
  }
  page.drawImage(image, {
    x: mmToPt(shape.x),
    y: yOf(shape.y + shape.h),
    width: mmToPt(shape.w),
    height: mmToPt(shape.h)
  });
}

export async function scenesToPdf(scenes: Scene[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const images = new Map<Uint8Array, Awaited<ReturnType<PDFDocument["embedPng"]>>>();
  for (const scene of scenes) {
    const page = doc.addPage([mmToPt(scene.widthMm), mmToPt(scene.heightMm)]);
    for (const shape of scene.shapes) {
      await drawShape(doc, page, shape, font, bold, images);
    }
  }
  return doc.save();
}

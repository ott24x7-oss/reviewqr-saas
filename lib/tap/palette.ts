import sharp from "sharp";
import { readableOn } from "./contrast";

function hex(n: number) {
  return n.toString(16).padStart(2, "0");
}

/** Average colour of a logo, plus a text colour that passes WCAG AA. */
export async function paletteFromImage(bytes: Buffer) {
  const { data } = await sharp(bytes, { failOn: "error", limitInputPixels: 8_000_000, animated: false })
    .rotate()
    .resize(1, 1, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bg = `#${hex(data[0])}${hex(data[1])}${hex(data[2])}`;
  return { bg, ink: readableOn(bg) };
}

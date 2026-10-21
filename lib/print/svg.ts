import type { Scene, Shape } from "./scene";

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fillOf(shape: { fill?: string }) {
  return shape.fill ? ` fill="${shape.fill}"` : ` fill="none"`;
}

function shapeSvg(shape: Shape) {
  if (shape.kind === "rect") {
    const radius = shape.radius ? ` rx="${shape.radius}" ry="${shape.radius}"` : "";
    const stroke = shape.stroke ? ` stroke="${shape.stroke}" stroke-width="0.15"` : "";
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}"${radius}${fillOf(shape)}${stroke}/>`;
  }
  if (shape.kind === "circle") {
    return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${shape.fill}"/>`;
  }
  if (shape.kind === "line") {
    return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.stroke}" stroke-width="${shape.width}" stroke-linecap="round"/>`;
  }
  if (shape.kind === "polygon") {
    const points = shape.points.map((point) => `${point.x},${point.y}`).join(" ");
    return `<polygon points="${points}" fill="${shape.fill}"/>`;
  }
  if (shape.kind === "text") {
    return `<text x="${shape.x}" y="${shape.y + shape.size * 0.82}" font-size="${shape.size}" font-family="Helvetica, Arial, sans-serif" font-weight="${shape.bold ? 700 : 400}" fill="${shape.fill}">${xml(shape.text)}</text>`;
  }
  const png = shape.bytes[0] === 0x89;
  const mime = png ? "image/png" : "image/jpeg";
  const href = `data:${mime};base64,${Buffer.from(shape.bytes).toString("base64")}`;
  return `<image x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" href="${href}"/>`;
}

export function sceneToSvg(scene: Scene) {
  const body = scene.shapes.map(shapeSvg).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${scene.widthMm}mm" height="${scene.heightMm}mm" viewBox="0 0 ${scene.widthMm} ${scene.heightMm}">${body}</svg>`;
}

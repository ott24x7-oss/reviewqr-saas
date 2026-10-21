import { mixHex } from "./color";
import type { PrintDesign } from "./design";
import { cutMarksFor, impose, type Box } from "./impose";
import { backLayout, faceLayout } from "./layout";
import { cellKind, createQrMatrix, isFinder, logoBox, QUIET_MODULES, type QrMatrix } from "./qr-check";
import type { PrintTemplate, SheetSize } from "./templates";
import { latinText } from "./text";
import { BLEED_MM, safeBox } from "./units";

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill?: string; radius?: number; stroke?: string }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: "polygon"; points: { x: number; y: number }[]; fill: string }
  | { kind: "text"; x: number; y: number; size: number; text: string; fill: string; bold?: boolean; maxWidth?: number }
  | { kind: "image"; x: number; y: number; w: number; h: number; bytes: Uint8Array };

export type Scene = { widthMm: number; heightMm: number; shapes: Shape[] };

const STAR = "#c8922a";

function starPoints(cx: number, cy: number, r: number) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = -Math.PI / 2 + i * (Math.PI / 5);
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return points;
}

function addBackground(shapes: Shape[], width: number, height: number, from: string, to: string | undefined, round: boolean) {
  if (round) {
    shapes.push({ kind: "circle", cx: width / 2, cy: height / 2, r: width / 2, fill: from });
    return;
  }
  if (!to || to.toLowerCase() === from.toLowerCase()) {
    shapes.push({ kind: "rect", x: 0, y: 0, w: width, h: height, fill: from });
    return;
  }
  const strips = 28;
  const band = height / strips;
  for (let i = 0; i < strips; i++) {
    shapes.push({
      kind: "rect",
      x: 0,
      y: i * band,
      w: width,
      h: band + 0.08,
      fill: mixHex(from, to, i / (strips - 1))
    });
  }
}

function addQr(shapes: Shape[], matrix: QrMatrix, design: PrintDesign, x: number, y: number, sizeMm: number) {
  const outer = matrix.size + QUIET_MODULES * 2;
  const moduleMm = sizeMm / outer;
  shapes.push({ kind: "rect", x, y, w: sizeMm, h: sizeMm, fill: design.qrLight });
  const logo = Boolean(design.logo);
  const solidEyes = design.eye !== "square" || design.module !== "square";
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      const role = cellKind(row, col, matrix.size, logo);
      if (role === "logo") continue;
      // Finder eyes are drawn as solid shapes below unless both styles are plain square,
      // so scanners always see unbroken finder patterns.
      if (role === "eye" && solidEyes) continue;
      if (!matrix.dark(row, col)) continue;
      const mx = x + (col + QUIET_MODULES) * moduleMm;
      const my = y + (row + QUIET_MODULES) * moduleMm;
      const t = (row + col) / (2 * Math.max(1, matrix.size - 1));
      const fill = design.qrDarkTo ? mixHex(design.qrDark, design.qrDarkTo, t) : design.qrDark;
      if (design.module === "dots") {
        shapes.push({ kind: "circle", cx: mx + moduleMm / 2, cy: my + moduleMm / 2, r: moduleMm * 0.5, fill });
      } else if (design.module === "rounded") {
        shapes.push({ kind: "rect", x: mx, y: my, w: moduleMm, h: moduleMm, radius: moduleMm * 0.38, fill });
      } else {
        // A hair of overlap so neighbouring modules print as one solid area (no white seams).
        shapes.push({ kind: "rect", x: mx, y: my, w: moduleMm + 0.02, h: moduleMm + 0.02, fill });
      }
    }
  }
  if (solidEyes) {
    const finders = [
      [0, 0],
      [0, matrix.size - 7],
      [matrix.size - 7, 0]
    ];
    for (const [row, col] of finders) {
      if (!isFinder(row, col, matrix.size)) continue;
      const ex = x + (col + QUIET_MODULES) * moduleMm;
      const ey = y + (row + QUIET_MODULES) * moduleMm;
      const side = 7 * moduleMm;
      if (design.eye === "circle") {
        const cx = ex + side / 2;
        const cy = ey + side / 2;
        shapes.push({ kind: "circle", cx, cy, r: side / 2, fill: design.qrDark });
        // Keep the 1:1:3:1:1 finder ratio: rings at 7, 5 and 3 modules.
        shapes.push({ kind: "circle", cx, cy, r: side * (2.5 / 7), fill: design.qrLight });
        shapes.push({ kind: "circle", cx, cy, r: side * (1.5 / 7), fill: design.qrDark });
      } else {
        const round = design.eye === "rounded" ? 1 : 0;
        shapes.push({ kind: "rect", x: ex, y: ey, w: side, h: side, radius: side * 0.28 * round, fill: design.qrDark });
        const inset = moduleMm;
        shapes.push({
          kind: "rect",
          x: ex + inset,
          y: ey + inset,
          w: side - inset * 2,
          h: side - inset * 2,
          radius: side * 0.18 * round,
          fill: design.qrLight
        });
        const pupil = moduleMm * 2;
        shapes.push({
          kind: "rect",
          x: ex + pupil,
          y: ey + pupil,
          w: side - pupil * 2,
          h: side - pupil * 2,
          radius: side * 0.12 * round,
          fill: design.qrDark
        });
      }
    }
  }
  if (design.logo) {
    const box = logoBox(matrix.size);
    const lx = x + (box.col + QUIET_MODULES) * moduleMm;
    const ly = y + (box.row + QUIET_MODULES) * moduleMm;
    const side = box.span * moduleMm;
    shapes.push({ kind: "rect", x: lx, y: ly, w: side, h: side, fill: design.qrLight });
    const pad = side * 0.08;
    shapes.push({ kind: "image", x: lx + pad, y: ly + pad, w: side - pad * 2, h: side - pad * 2, bytes: design.logo });
  }
}

function addNfc(shapes: Shape[], x: number, y: number, size: number, fill: string) {
  const cx = x + size * 0.28;
  const cy = y + size * 0.5;
  shapes.push({ kind: "circle", cx, cy, r: size * 0.08, fill });
  for (const scale of [0.32, 0.52]) {
    const radius = size * scale;
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i <= 7; i++) {
      const angle = -Math.PI / 3 + (i / 7) * ((2 * Math.PI) / 3);
      const point = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
      if (prev) {
        shapes.push({ kind: "line", x1: prev.x, y1: prev.y, x2: point.x, y2: point.y, stroke: fill, width: Math.max(0.25, size * 0.06) });
      }
      prev = point;
    }
  }
}

function addStars(shapes: Shape[], x: number, y: number, size: number) {
  for (let i = 0; i < 5; i++) {
    const cx = x + size / 2 + i * (size + 0.7);
    shapes.push({ kind: "polygon", points: starPoints(cx, y + size / 2, size / 2), fill: STAR });
  }
}

function raster(design: PrintDesign, id: PrintDesign["rasters"][number]["id"]) {
  return design.rasters.find((item) => item.id === id);
}

function addRasterOrText(
  shapes: Shape[],
  design: PrintDesign,
  id: PrintDesign["rasters"][number]["id"],
  text: string,
  slot: { x: number; y: number; size: number; maxWidth: number },
  bold = false
) {
  const image = raster(design, id);
  if (image) {
    shapes.push({
      kind: "image",
      x: image.xMm,
      y: image.yMm,
      w: image.widthMm,
      h: image.heightMm,
      bytes: image.bytes
    });
    return;
  }
  const line = latinText(text);
  if (!line) return;
  shapes.push({
    kind: "text",
    x: slot.x,
    y: slot.y,
    size: slot.size,
    maxWidth: slot.maxWidth,
    text: line,
    fill: design.foreground,
    bold
  });
}

function frontShapes(template: PrintTemplate, design: PrintDesign, qrMm: number, matrix: QrMatrix, label: string, code: string) {
  const shapes: Shape[] = [];
  const layout = faceLayout(template, qrMm);
  addQr(shapes, matrix, design, layout.qr.x, layout.qr.y, layout.qr.size);
  addRasterOrText(shapes, design, "name", design.name, layout.name, true);
  addRasterOrText(shapes, design, "cta", design.cta, layout.cta);
  if (design.ctaHi.trim() || raster(design, "cta-hi")) {
    addRasterOrText(shapes, design, "cta-hi", "", layout.ctaHi);
  }
  if (design.showStars) addStars(shapes, layout.stars.x, layout.stars.y, layout.stars.size);
  if (design.showNfc) addNfc(shapes, layout.nfc.x, layout.nfc.y, layout.nfc.size, design.foreground);
  const caption = latinText(label) ? `${latinText(label)}  ${code}` : code;
  shapes.push({
    kind: "text",
    x: layout.label.x,
    y: layout.label.y,
    size: layout.label.size,
    maxWidth: layout.label.maxWidth,
    text: caption,
    fill: design.foreground
  });
  return shapes;
}

function backShapes(template: PrintTemplate, design: PrintDesign) {
  const shapes: Shape[] = [];
  const back = backLayout(template);
  addRasterOrText(shapes, design, "back-name", design.name, back.name, true);
  addRasterOrText(shapes, design, "back-line", design.backLine, back.line);
  return shapes;
}

function offsetShapes(shapes: Shape[], dx: number, dy: number): Shape[] {
  return shapes.map((shape) => {
    if (shape.kind === "rect" || shape.kind === "text" || shape.kind === "image") {
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
    }
    if (shape.kind === "circle") return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
    if (shape.kind === "line") {
      return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
    }
    return { ...shape, points: shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
  });
}

function marks(shapes: Shape[], box: Box, markMm: number, gapMm: number) {
  for (const mark of cutMarksFor(box, markMm, gapMm)) {
    shapes.push({ kind: "line", ...mark, stroke: "#111111", width: 0.2 });
  }
}

export function buildPrintScenes(input: {
  design: PrintDesign;
  template: PrintTemplate;
  preset: "exact" | "bleed" | "sheet";
  sheet: SheetSize | null;
  codes: { code: string; label: string; url: string }[];
  qrMm: number;
}): Scene[] {
  const { template, design } = input;
  const matrices = new Map<string, QrMatrix>();
  const matrixFor = (url: string) => {
    const cached = matrices.get(url);
    if (cached) return cached;
    const created = createQrMatrix(url);
    matrices.set(url, created);
    return created;
  };

  const paintCard = (shapes: Shape[], width: number, height: number) => {
    addBackground(shapes, width, height, design.background, design.backgroundTo, template.shape === "round");
    if (design.backgroundImage && template.shape !== "round") {
      shapes.push({ kind: "image", x: 0, y: 0, w: width, h: height, bytes: design.backgroundImage });
    }
  };

  if (input.preset === "sheet") {
    if (!input.sheet) return [];
    const layout = impose({
      itemWidthMm: template.widthMm,
      itemHeightMm: template.heightMm,
      sheetWidthMm: input.sheet.widthMm,
      sheetHeightMm: input.sheet.heightMm
    });
    const perPage = Math.max(1, layout.count);
    const scenes: Scene[] = [];
    for (let start = 0; start < input.codes.length; start += perPage) {
      const shapes: Shape[] = [{ kind: "rect", x: 0, y: 0, w: input.sheet.widthMm, h: input.sheet.heightMm, fill: "#ffffff" }];
      const slice = input.codes.slice(start, start + perPage);
      slice.forEach((item, index) => {
        const place = layout.placements[index];
        if (!place) return;
        const card: Shape[] = [];
        paintCard(card, template.widthMm, template.heightMm);
        card.push(...frontShapes(template, design, input.qrMm, matrixFor(item.url), item.label, item.code));
        shapes.push(...offsetShapes(card, place.x, place.y));
      });
      for (const mark of layout.cutMarks) {
        shapes.push({ kind: "line", ...mark, stroke: "#111111", width: 0.15 });
      }
      scenes.push({ widthMm: input.sheet.widthMm, heightMm: input.sheet.heightMm, shapes });
    }
    return scenes;
  }

  const scenes: Scene[] = [];
  for (const item of input.codes) {
    const content = [frontShapes(template, design, input.qrMm, matrixFor(item.url), item.label, item.code)];
    if (template.faces === 2) content.push(backShapes(template, design));
    for (const face of content) {
      if (input.preset === "exact") {
        const shapes: Shape[] = [];
        paintCard(shapes, template.widthMm, template.heightMm);
        shapes.push(...face);
        scenes.push({ widthMm: template.widthMm, heightMm: template.heightMm, shapes });
        continue;
      }
      const width = template.widthMm + BLEED_MM * 2;
      const height = template.heightMm + BLEED_MM * 2;
      const shapes: Shape[] = [];
      addBackground(shapes, width, height, design.background, design.backgroundTo, false);
      if (design.backgroundImage && template.shape !== "round") {
        shapes.push({ kind: "image", x: 0, y: 0, w: width, h: height, bytes: design.backgroundImage });
      }
      if (template.shape === "round") {
        shapes.push({
          kind: "circle",
          cx: width / 2,
          cy: height / 2,
          r: template.widthMm / 2,
          fill: design.background
        });
      }
      shapes.push(...offsetShapes(face, BLEED_MM, BLEED_MM));
      marks(shapes, { x: BLEED_MM, y: BLEED_MM, widthMm: template.widthMm, heightMm: template.heightMm }, 2.2, 0.5);
      const safe = safeBox(template.widthMm, template.heightMm, template.safeMm);
      shapes.push({
        kind: "rect",
        x: BLEED_MM + safe.x,
        y: BLEED_MM + safe.y,
        w: safe.widthMm,
        h: safe.heightMm,
        stroke: "#8a8175"
      });
      scenes.push({ widthMm: width, heightMm: height, shapes });
    }
  }
  return scenes;
}

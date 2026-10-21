/** Sheet layout in millimetres. Y grows downward from the top-left of the sheet. */

export type Box = { x: number; y: number; widthMm: number; heightMm: number };

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type ImposeResult = {
  columns: number;
  rows: number;
  count: number;
  originX: number;
  originY: number;
  placements: Box[];
  cutMarks: Segment[];
};

const MARK_MM = 3;
const MARK_GAP_MM = 1;

export function cutMarksFor(box: Box, markMm = MARK_MM, gapMm = MARK_GAP_MM): Segment[] {
  const corners = [
    { x: box.x, y: box.y, sx: -1, sy: -1 },
    { x: box.x + box.widthMm, y: box.y, sx: 1, sy: -1 },
    { x: box.x, y: box.y + box.heightMm, sx: -1, sy: 1 },
    { x: box.x + box.widthMm, y: box.y + box.heightMm, sx: 1, sy: 1 }
  ];
  const marks: Segment[] = [];
  for (const corner of corners) {
    marks.push({
      x1: corner.x + corner.sx * gapMm,
      y1: corner.y,
      x2: corner.x + corner.sx * (gapMm + markMm),
      y2: corner.y
    });
    marks.push({
      x1: corner.x,
      y1: corner.y + corner.sy * gapMm,
      x2: corner.x,
      y2: corner.y + corner.sy * (gapMm + markMm)
    });
  }
  return marks;
}

function across(space: number, item: number, gutter: number) {
  if (item <= 0 || space + 1e-6 < item) return 0;
  return Math.floor((space + gutter + 1e-6) / (item + gutter));
}

function insideTrim(x: number, y: number, placements: Box[]) {
  return placements.some(
    (box) => x > box.x + 1e-6 && x < box.x + box.widthMm - 1e-6 && y > box.y + 1e-6 && y < box.y + box.heightMm - 1e-6
  );
}

export function impose(input: {
  itemWidthMm: number;
  itemHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  gutterMm?: number;
}): ImposeResult {
  const gutter = input.gutterMm ?? 0;
  const columns = across(input.sheetWidthMm, input.itemWidthMm, gutter);
  const rows = across(input.sheetHeightMm, input.itemHeightMm, gutter);
  const usedW = columns > 0 ? columns * input.itemWidthMm + (columns - 1) * gutter : 0;
  const usedH = rows > 0 ? rows * input.itemHeightMm + (rows - 1) * gutter : 0;
  const originX = (input.sheetWidthMm - usedW) / 2;
  const originY = (input.sheetHeightMm - usedH) / 2;
  const placements: Box[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      placements.push({
        x: originX + column * (input.itemWidthMm + gutter),
        y: originY + row * (input.itemHeightMm + gutter),
        widthMm: input.itemWidthMm,
        heightMm: input.itemHeightMm
      });
    }
  }
  const cutMarks = placements
    .flatMap((box) => cutMarksFor(box))
    .filter((mark) => {
      const midX = (mark.x1 + mark.x2) / 2;
      const midY = (mark.y1 + mark.y2) / 2;
      return !insideTrim(midX, midY, placements);
    });
  return { columns, rows, count: placements.length, originX, originY, placements, cutMarks };
}

export function placementInsideSheet(box: Box, sheetWidthMm: number, sheetHeightMm: number) {
  return box.x >= -1e-6 && box.y >= -1e-6 && box.x + box.widthMm <= sheetWidthMm + 1e-6 && box.y + box.heightMm <= sheetHeightMm + 1e-6;
}

export function hexRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(from: string, to: string, t: number) {
  const a = hexRgb(from);
  const b = hexRgb(to);
  if (!a || !b) return from;
  const u = Math.min(1, Math.max(0, t));
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * u);
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
}

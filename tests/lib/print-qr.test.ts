import { describe, expect, it } from "vitest";
import { cellKind, checkQrInk, createQrMatrix, logoBox, outerCellKind, outerModules, QUIET_MODULES } from "../../lib/print/qr-check";

const url = "https://reviewqr.example/t/ABCD2345?src=nfc";

describe("QR matrix", () => {
  it("encodes at error correction H with a four-module quiet zone", () => {
    const matrix = createQrMatrix(url);
    expect(matrix.errorCorrection).toBe("H");
    expect(matrix.size).toBeGreaterThan(20);
    expect(outerModules(matrix.size)).toBe(matrix.size + 8);
    for (let i = 0; i < QUIET_MODULES; i++) {
      expect(outerCellKind(i, 0, matrix.size, false)).toBe("quiet");
      expect(outerCellKind(0, i, matrix.size, false)).toBe("quiet");
      expect(outerCellKind(matrix.size + QUIET_MODULES, i, matrix.size, false)).toBe("quiet");
    }
    expect(outerCellKind(QUIET_MODULES, QUIET_MODULES, matrix.size, false)).toBe("eye");
  });

  it("punches the centre logo out of the data modules", () => {
    const matrix = createQrMatrix(url);
    const box = logoBox(matrix.size);
    expect(box.span).toBe(Math.round(matrix.size * 0.18));
    const midRow = box.row + Math.floor(box.span / 2);
    const midCol = box.col + Math.floor(box.span / 2);
    expect(cellKind(midRow, midCol, matrix.size, true)).toBe("logo");
    expect(cellKind(0, 0, matrix.size, true)).toBe("eye");
    expect(cellKind(midRow, midCol, matrix.size, false)).not.toBe("logo");
  });
});

describe("QR ink", () => {
  it("accepts dark modules on a light ground", () => {
    const check = checkQrInk({ dark: "#111111", light: "#ffffff" }, 25);
    expect(check.contrastOk).toBe(true);
    expect(check.polarityOk).toBe(true);
    expect(check.ok).toBe(true);
    expect(check.tooSmall).toBe(false);
  });

  it("rejects inverted colours even when contrast is high", () => {
    const check = checkQrInk({ dark: "#ffffff", light: "#111111" }, 25);
    expect(check.polarityOk).toBe(false);
    expect(check.ok).toBe(false);
    expect(check.ratio).toBeGreaterThan(4);
  });

  it("rejects a gradient stop that becomes lighter than the ground", () => {
    const check = checkQrInk({ dark: "#111111", darkTo: "#ffffff", light: "#ffffff" }, 25);
    expect(check.polarityOk).toBe(false);
    expect(check.contrastOk).toBe(false);
  });

  it("accepts a dark gradient and warns under 20 mm", () => {
    const pass = checkQrInk({ dark: "#111111", darkTo: "#333333", light: "#ffffff" }, 20);
    expect(pass.ok).toBe(true);
    expect(pass.tooSmall).toBe(false);
    const small = checkQrInk({ dark: "#111111", light: "#ffffff" }, 19.9);
    expect(small.ok).toBe(true);
    expect(small.tooSmall).toBe(true);
  });

  it("rejects low contrast", () => {
    const check = checkQrInk({ dark: "#777777", light: "#888888" }, 30);
    expect(check.contrastOk).toBe(false);
    expect(check.ok).toBe(false);
  });
});

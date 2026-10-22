import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components", "lib", "apps/mobile"];
const SKIP_DIRS = new Set(["node_modules", ".expo", "android", "ios", "dist", "coverage"]);
const TEXT = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".html", ".css"]);

function walk(dir: string, hits: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, hits);
      continue;
    }
    if (!TEXT.has(path.extname(entry.name)) || entry.name === "package-lock.json") continue;
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.includes("ReviewQR")) return;
      const file = full.replace(/\\/g, "/");
      if (file.endsWith("lib/brand-defaults.ts") && line.includes("PREVIOUS_BRAND_NAME")) return;
      hits.push(`${file}:${index + 1}`);
    });
  }
}

describe("brand copy", () => {
  it("does not leave ReviewQR in user-facing app, component, lib, or mobile copy", () => {
    const hits: string[] = [];
    for (const root of ROOTS) walk(root, hits);
    expect(hits).toEqual([]);
  });
});

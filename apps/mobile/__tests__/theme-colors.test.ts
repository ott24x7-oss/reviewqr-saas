import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const mobileRoot = path.join(__dirname, "..");
const colorLiteral = new RegExp("[#]" + "(?:[0-9a-fA-F]{3,8})\\b|\\b(?:r" + "gb|r" + "gba)\\s*\\(", "i");
const themeTokenFiles = new Set([path.join("src", "ui", "tokens.ts")]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.isFile() && /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("theme color usage", () => {
  it("keeps literal colors inside the theme token files", () => {
    const offending = ["app", "src"]
      .flatMap((directory) => sourceFiles(path.join(mobileRoot, directory)))
      .filter((file) => {
        const relative = path.relative(mobileRoot, file);
        return !themeTokenFiles.has(relative) && colorLiteral.test(readFileSync(file, "utf8"));
      })
      .map((file) => path.relative(mobileRoot, file));

    expect(offending).toEqual([]);
  });
});

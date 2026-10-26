import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const colorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
const themeFiles = new Set(["src/ui/tokens.ts", "src/ui/theme.tsx", "src/ui/cinematic-background.tsx"]);

function collectFiles(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [target] : [];
  });
}

it("keeps literal hex and rgb colors in theme files", () => {
  const files = ["app", "src"].flatMap((folder) => collectFiles(path.join(root, folder)));
  const violations = files.flatMap((file) => {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (themeFiles.has(relative)) return [];
    return fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => colorPattern.test(line) ? [`${relative}:${index + 1}`] : []);
  });
  expect(violations).toEqual([]);
});

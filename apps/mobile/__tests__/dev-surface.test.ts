import fs from "fs";
import path from "path";
import { devCodeFrom } from "../src/auth/otp";
import { devSurfaceAllowed } from "../src/auth/dev-surface";

const PHRASES = ["dev build", "Dev code", "डेव बिल्ड", "डेव कोड"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("dev OTP surface", () => {
  it("is off for a release bundle and for the production API", () => {
    expect(devSurfaceAllowed({ dev: false, apiUrl: "http://192.168.1.8:3000" })).toBe(false);
    expect(devSurfaceAllowed({ dev: true, apiUrl: "https://qr24x7.in" })).toBe(false);
    expect(devSurfaceAllowed({ dev: true, apiUrl: "https://qr24x7.in/" })).toBe(false);
    expect(devSurfaceAllowed({ dev: true, apiUrl: "http://192.168.1.8:3000" })).toBe(true);
    expect(devCodeFrom({ devCode: "123456" }, { dev: false, apiUrl: "http://localhost:3000" })).toBeNull();
    expect(devCodeFrom({ devCode: "123456" }, { dev: true, apiUrl: "https://qr24x7.in" })).toBeNull();
  });

  it("keeps dev OTP strings behind the guard", () => {
    const root = path.join(__dirname, "..");
    const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "src"))];
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const phrase of PHRASES) {
        if (!text.includes(phrase)) continue;
        expect(path.basename(file)).toBe("copy.ts");
        expect(text).toContain("devSurfaceAllowed()");
      }
      if (text.includes("t.devHint") || /\{(?:devCode|shownCode)\}/.test(text)) {
        expect(text).toContain("devSurfaceAllowed()");
      }
    }
  });
});

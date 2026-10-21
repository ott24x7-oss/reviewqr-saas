import fs from "fs";
import path from "path";

function readKey(file: string, key: string) {
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

if (!process.env.DATABASE_URL) {
  const fromFile =
    readKey(path.join(process.cwd(), ".env.local"), "DATABASE_URL") ||
    readKey(path.join(process.cwd(), ".env"), "DATABASE_URL");
  if (fromFile) process.env.DATABASE_URL = fromFile;
}

if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 16) {
  process.env.AUTH_TOKEN_SECRET = "unit-test-auth-secret-16";
}

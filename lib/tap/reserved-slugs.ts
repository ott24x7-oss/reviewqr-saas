import fs from "fs";
import path from "path";

/** Routes that do not have their own top-level folder under app/. */
export const FIXED_RESERVED_SLUGS = [
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "dashboard",
  "t",
  "o",
  "health",
  "sitemap",
  "robots",
  "widget",
  "favicon",
  "invite"
];

export function defaultAppDir() {
  return path.join(process.cwd(), "app");
}

/** Top-level app folders, plus the fixed list. Route groups and _ folders are free. */
export function reservedFromAppDir(appDir: string) {
  let names: string[] = [];
  try {
    names = fs
      .readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("(") && !entry.name.startsWith("_"))
      .map((entry) => entry.name);
  } catch {
    names = [];
  }
  return new Set([...names, ...FIXED_RESERVED_SLUGS].map((name) => name.toLowerCase()));
}

export function isReservedSlug(slug: string, appDir = defaultAppDir()) {
  return reservedFromAppDir(appDir).has(slug.trim().toLowerCase());
}

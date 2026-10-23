import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "").trim();
if (!dsn) {
  console.log("Sentry source maps skipped: DSN is unset.");
  process.exit(0);
}

const org = (process.env.SENTRY_ORG || "").trim();
const project = (process.env.SENTRY_PROJECT || "").trim();
const token = (process.env.SENTRY_AUTH_TOKEN || "").trim();
if (!org || !project || !token) {
  console.log("Sentry source maps skipped: set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN.");
  process.exit(0);
}

if (!existsSync("dist")) {
  console.log(
    "Sentry source maps: no dist folder. The Expo plugin uploads maps during the native EAS build when the token is set."
  );
  process.exit(0);
}

const result = spawnSync("npx", ["sentry-expo-upload-sourcemaps", "dist"], {
  stdio: "inherit",
  shell: true,
  env: process.env
});
process.exit(result.status ?? 1);

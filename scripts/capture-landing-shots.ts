/**
 * Screenshot the seeded demo café at 390x844 @2x and write AVIF/WebP for the home phone frames.
 * One command: npm run landing:shots
 * Starts its own Next dev server and stops only that process.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Page } from "@playwright/test";

const PORT = 3477;
const BASE = `http://127.0.0.1:${PORT}`;
const DEMO_EMAIL = "demo@reviewqr.in";
const DEMO_PASSWORD = "Demo@123";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function stop(child: ChildProcess | null) {
  if (!child?.pid) return Promise.resolve();
  if (process.platform === "win32") {
    return new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  }
  child.kill("SIGTERM");
  return Promise.resolve();
}

async function waitForServer(child: ChildProcess) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < 240_000) {
    if (child.exitCode != null) throw new Error(`dev server exited ${child.exitCode}: ${last}`);
    try {
      const response = await fetch(`${BASE}/t/DEMO-CNTR`, { redirect: "manual" });
      if (response.status < 500) return response.status;
      last = String(response.status);
    } catch (error) {
      last = error instanceof Error ? error.message : "waiting";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`dev server did not answer: ${last}`);
}

async function runSeed() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join("node_modules", "tsx", "dist", "cli.mjs"), "prisma/seed.ts"], {
      env: process.env,
      stdio: "inherit"
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });
}

async function publish(png: Buffer, name: string) {
  const dir = path.join("public", "landing", "ui");
  fs.mkdirSync(dir, { recursive: true });
  for (const width of [480, 960]) {
    const image = sharp(png).resize({ width, withoutEnlargement: true });
    await image.clone().avif({ quality: 45, effort: 4 }).toFile(path.join(dir, `${name}-${width}.avif`));
    await image.webp({ quality: 72 }).toFile(path.join(dir, `${name}-${width}.webp`));
  }
  const size = fs.statSync(path.join(dir, `${name}-480.avif`)).size;
  console.log(`${name} 480 avif ${size}`);
}

async function shot(page: Page, name: string) {
  const png = await page.screenshot({ type: "png" });
  await publish(png, name);
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce"
  });
  try {
    page.on("popup", (popup) => {
      void popup.close();
    });
    await page.route(/google\.com/, (route) => route.abort());

    await page.goto(`${BASE}/t/DEMO-CNTR`, { waitUntil: "domcontentloaded" });
    await page.getByText("Spice Junction", { exact: false }).first().waitFor({ timeout: 30_000 });
    await shot(page, "tap");

    await page.goto(`${BASE}/t/DEMO-CNTR/menu`, { waitUntil: "domcontentloaded" });
    await page.locator("button.store-add:not([disabled])").first().waitFor({ timeout: 30_000 });
    await shot(page, "menu");
    await page.locator("button.store-add:not([disabled])").first().click();
    await page.locator(".store-bar").click();
    await page.locator(".store-sheet").first().waitFor();
    await shot(page, "order");

    await page.goto(`${BASE}/r/demo-cafe`, { waitUntil: "domcontentloaded" });
    const stars = page.getByRole("button", { name: "5 stars" });
    await stars.waitFor();
    const googleStep = page.getByRole("heading", { name: "Leave a public review" });
    let revealed = false;
    for (let attempt = 0; attempt < 8 && !revealed; attempt += 1) {
      await stars.click();
      revealed = await googleStep
        .waitFor({ timeout: 2_000 })
        .then(() => true)
        .catch(() => false);
    }
    if (!revealed) {
      const text = await page.locator("body").innerText();
      throw new Error(`google review step did not open: ${text.slice(0, 500).replace(/\s+/g, " ")}`);
    }
    await googleStep.scrollIntoViewIfNeeded();
    await shot(page, "review");

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const button = document.querySelector('button[type="submit"]');
      return Boolean(button && Object.keys(button).some((key) => key.startsWith("__react")));
    });
    await page.locator("#email").fill(DEMO_EMAIL);
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    const loggedIn = await page
      .waitForURL(/\/dashboard/, { timeout: 40_000 })
      .then(() => true)
      .catch(() => false);
    if (!loggedIn) {
      const text = await page.locator("body").innerText();
      throw new Error(`demo login stayed on ${page.url()}: ${text.slice(0, 400).replace(/\s+/g, " ")}`);
    }
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /Overview|Welcome/ }).waitFor({ timeout: 30_000 });
    await shot(page, "dashboard");

    await page.goto(`${BASE}/dashboard/qr-codes/DEMO-CNTR`, { waitUntil: "domcontentloaded" });
    const posterQr = page.locator("#qr-poster img");
    await posterQr.waitFor();
    const loaded = await page
      .waitForFunction(() => {
        const img = document.querySelector("#qr-poster img") as HTMLImageElement | null;
        return Boolean(img && img.complete && img.naturalWidth > 10);
      })
      .then(() => true)
      .catch(() => false);
    if (!loaded) {
      const src = await posterQr.getAttribute("src");
      throw new Error(`poster QR did not paint (${src || "no src"})`);
    }
    await page.locator("#qr-poster").scrollIntoViewIfNeeded();
    await shot(page, "poster");
  } finally {
    await browser.close();
  }
}

async function portBusy() {
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  loadEnvLocal();
  if (await portBusy()) throw new Error(`port ${PORT} is already in use`);
  const child = spawn(
    process.execPath,
    [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)],
    {
      env: { ...process.env, PORT: String(PORT), NEXT_DIST_DIR: ".next-shots" },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout?.on("data", (chunk) => {
    const line = String(chunk);
    if (/ready|error|Error/i.test(line)) process.stdout.write(line);
  });
  child.stderr?.on("data", (chunk) => {
    const line = String(chunk);
    if (/error|Error/i.test(line)) process.stderr.write(line);
  });
  try {
    const status = await waitForServer(child);
    if (status === 404) {
      console.log("demo café missing, seeding");
      await runSeed();
      const again = await fetch(`${BASE}/t/DEMO-CNTR`);
      if (again.status >= 400) throw new Error(`tap page status ${again.status} after seed`);
    }
    await capture();
  } finally {
    await stop(child);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

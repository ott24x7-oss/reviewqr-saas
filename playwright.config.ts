import { defineConfig, devices } from "@playwright/test";

const port = 3459;
const baseURL = `http://127.0.0.1:${port}`;

function serverEnv() {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  env.PORT = String(port);
  env.NEXTAUTH_URL = baseURL;
  env.NEXT_PUBLIC_APP_URL = baseURL;
  env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "e2e-secret-not-for-production";
  env.YOUPI_BASE_URL = process.env.YOUPI_BASE_URL || "https://pay.example.test";
  env.YOUPI_MERCHANT_ID = process.env.YOUPI_MERCHANT_ID || "merchant_test";
  env.PAYMENTS_RAZORPAY_ENABLED = "false";
  env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "";
  env.TURNSTILE_SECRET_KEY = "";
  env.OTP_DEV_REVEAL = "1";
  env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "e2e-auth-token-secret-16";
  return env;
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: serverEnv()
  }
});

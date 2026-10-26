import { defineConfig, devices } from "@playwright/test";

// Owner flows run against a production build (what Railway serves).
// The OTP API spec needs OTP_DEV_REVEAL, which only works outside production,
// so it gets its own dev server on a second port.
const port = 3459;
const devPort = 3460;
const baseURL = `http://127.0.0.1:${port}`;
const devURL = `http://127.0.0.1:${devPort}`;

function serverEnv(url: string, portNumber: number, revealOtp: boolean) {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  env.PORT = String(portNumber);
  env.NEXTAUTH_URL = url;
  env.NEXT_PUBLIC_APP_URL = url;
  env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "e2e-secret-not-for-production";
  env.REGISTER_IP_LIMIT = "50";
  env.YOUPI_BASE_URL = process.env.YOUPI_BASE_URL || "https://pay.example.test";
  env.YOUPI_MERCHANT_ID = process.env.YOUPI_MERCHANT_ID || "merchant_test";
  env.PAYMENTS_RAZORPAY_ENABLED = "false";
  env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "";
  env.TURNSTILE_SECRET_KEY = "";
  if (revealOtp) {
    env.OTP_DEV_REVEAL = "1";
    env.SHOP_PAYMENT_STUB = "1";
    env.NEXT_DIST_DIR = ".next-e2e-dev";
  } else {
    delete env.OTP_DEV_REVEAL;
    delete env.SHOP_PAYMENT_STUB;
    delete env.NEXT_DIST_DIR;
  }
  env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "e2e-auth-token-secret-16";
  return env;
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // One worker: the dev server compiles pages on first hit and competes with the production server.
  workers: 1,
  retries: 0,
  use: { trace: "on-first-retry" },
  projects: [
    {
      name: "app",
      testMatch: /owner-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL }
    },
    {
      name: "otp-api",
      testMatch: /otp-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "shop",
      testMatch: /shop-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "plans",
      testMatch: /plans-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "direct",
      testMatch: /direct-link\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL }
    },
    {
      name: "free-store",
      testMatch: /free-store\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "public-page",
      testMatch: /public-page\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "landing",
      testMatch: /landing-v2\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL }
    },
    {
      name: "phase8",
      testMatch: /phase8\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL }
    },
    {
      name: "admin",
      testMatch: /admin-device\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    },
    {
      name: "admin-web",
      testMatch: /admin-web\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: devURL }
    }
  ],
  webServer: [
    {
      command: `npx next start -p ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: serverEnv(baseURL, port, false)
    },
    {
      command: `npx next dev -p ${devPort}`,
      url: devURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: serverEnv(devURL, devPort, true)
    }
  ]
});

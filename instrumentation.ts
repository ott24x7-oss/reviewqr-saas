export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { warnDevOtpInProduction } = await import("./lib/auth/dev-otp");
  warnDevOtpInProduction();
}

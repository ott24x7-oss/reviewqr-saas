export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { warnDevOtpInProduction } = await import("./lib/auth/dev-otp");
  const { warnShopPaymentStubInProduction } = await import("./lib/shop/payment-stub");
  warnDevOtpInProduction();
  warnShopPaymentStubInProduction();
}

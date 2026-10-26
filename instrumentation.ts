export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { warnDevOtpInProduction } = await import("./lib/auth/dev-otp");
  const { warnShopPaymentStubInProduction } = await import("./lib/shop/payment-stub");
  warnDevOtpInProduction();
  warnShopPaymentStubInProduction();
  // Written as a nodejs check so webpack leaves the database and Baileys out of the edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleBaileysAutostart } = await import("./lib/boot/baileys-autostart");
    scheduleBaileysAutostart();
  }
}

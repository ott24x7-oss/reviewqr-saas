export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { warnDevOtpInProduction } = await import("./lib/auth/dev-otp");
  const { warnShopPaymentStubInProduction } = await import("./lib/shop/payment-stub");
  warnDevOtpInProduction();
  warnShopPaymentStubInProduction();
  if (process.env.NODE_ENV === "production" && process.env.BAILEYS_AUTOSTART !== "0") {
    // Reconnect WhatsApp with the saved login after every deploy or restart.
    const { getBaileys } = await import("./lib/whatsapp-baileys");
    setTimeout(() => {
      getBaileys()
        .autoStart()
        .catch((error) => console.error("[baileys] autostart:", error instanceof Error ? error.message : error));
    }, 5_000);
  }
}

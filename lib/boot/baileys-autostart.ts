import { getBaileys } from "../whatsapp-baileys";

/** Reconnect WhatsApp with the saved login after every deploy or restart. */
export function scheduleBaileysAutostart() {
  if (process.env.NODE_ENV !== "production" || process.env.BAILEYS_AUTOSTART === "0") return;
  setTimeout(() => {
    getBaileys()
      .autoStart()
      .catch((error) => console.error("[baileys] autostart:", error instanceof Error ? error.message : error));
  }, 5_000);
}

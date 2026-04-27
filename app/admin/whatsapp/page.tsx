import { getWhatsAppConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { WhatsAppConfigForm } from "./whatsapp-form";
import { BaileysPanel } from "./baileys-panel";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const cfg = await getWhatsAppConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Pick how outbound WhatsApp messages get sent. Baileys (unofficial WhatsApp Web) is free
          and fast to set up; Cloud API is the official Meta product; click-to-chat opens
          wa.me links manually.
        </p>
      </div>
      <WhatsAppConfigForm initial={{ ...cfg, apiToken: maskSecret(cfg.apiToken) }} />
      <BaileysPanel />
    </div>
  );
}

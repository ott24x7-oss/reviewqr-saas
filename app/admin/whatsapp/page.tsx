import { getWhatsAppConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { WhatsAppConfigForm } from "./whatsapp-form";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const cfg = await getWhatsAppConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Optional — Cloud API for programmatic sending. Leave empty to use click-to-chat fallback.
        </p>
      </div>
      <WhatsAppConfigForm initial={{ ...cfg, apiToken: maskSecret(cfg.apiToken) }} />
    </div>
  );
}

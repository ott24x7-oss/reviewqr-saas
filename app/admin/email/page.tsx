import { getEmailConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { EmailConfigForm } from "./email-form";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const cfg = await getEmailConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Email transport</h1>
        <p className="text-sm text-muted-foreground">
          Configure outbound email — PHP relay (recommended on Railway) or direct SMTP.
        </p>
      </div>
      <EmailConfigForm
        initial={{
          ...cfg,
          smtpPass: maskSecret(cfg.smtpPass),
          relaySecret: maskSecret(cfg.relaySecret)
        }}
      />
    </div>
  );
}

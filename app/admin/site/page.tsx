import { getSiteConfig, getTurnstileConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { SiteForm } from "./site-form";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const [site, turnstile] = await Promise.all([getSiteConfig(), getTurnstileConfig()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Site settings</h1>
        <p className="text-sm text-muted-foreground">
          Branding, signups, maintenance mode, and bot protection
        </p>
      </div>
      <SiteForm
        site={site}
        turnstile={{ ...turnstile, secretKey: maskSecret(turnstile.secretKey) }}
      />
    </div>
  );
}

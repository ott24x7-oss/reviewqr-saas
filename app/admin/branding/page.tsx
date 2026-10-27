import { requireAdminPage } from "@/lib/admin";
import { BrandingForm } from "./branding-form";
import { loadAdminPlatformBranding } from "@/lib/admin/site-admin";

export const dynamic = "force-dynamic";

export default async function AdminBrandingPage() {
  await requireAdminPage();

  const initial = await loadAdminPlatformBranding();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Frontend branding</h1>
        <p className="text-sm text-muted-foreground">
          Override the QR24x7 platform logo, brand name, tagline, footer and
          primary color shown on customer-facing marketing pages. Changes apply within
          ~60 seconds without a redeploy. Per-business branding is unaffected.
        </p>
      </div>
      <BrandingForm initial={initial} />
    </div>
  );
}

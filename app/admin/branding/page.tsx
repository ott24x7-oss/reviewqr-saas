import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function AdminBrandingPage() {
  await requireAdminPage();

  let initial = {
    logoDataUrl: "",
    brandName: "",
    tagline: "",
    footerText: "",
    primaryColor: ""
  };
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: "singleton" } });
    if (row) {
      initial = {
        logoDataUrl: row.logoDataUrl,
        brandName: row.brandName,
        tagline: row.tagline,
        footerText: row.footerText,
        primaryColor: row.primaryColor
      };
    }
  } catch {
    // Migration not yet applied — render the form with empty defaults so
    // the admin can still see the UI; saving will fail until migrate runs.
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Frontend branding</h1>
        <p className="text-sm text-muted-foreground">
          Override the WatShop Review platform logo, brand name, tagline, footer and
          primary color shown on customer-facing marketing pages. Changes apply within
          ~60 seconds without a redeploy. Per-business branding is unaffected.
        </p>
      </div>
      <BrandingForm initial={initial} />
    </div>
  );
}

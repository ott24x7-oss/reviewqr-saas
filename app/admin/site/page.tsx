import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { loadAdminWebsiteSettings, adminSettingsSection } from "@/lib/admin/site-admin";
import { PageHeader } from "@/components/admin/ui/primitives";
import { AdminButton } from "@/components/admin/ui/controls";
import { SiteForm } from "../site/site-form";
import { BrandingForm } from "../branding/branding-form";

export const dynamic = "force-dynamic";

export default async function AdminSitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  await requireAdminPage();
  const params = await searchParams;
  const section = adminSettingsSection(params.tab, ["settings", "branding"], "settings");
  const { site, turnstile, branding } = await loadAdminWebsiteSettings();
  return <div className="space-y-5"><PageHeader title="Website" subtitle="Manage app settings, marketing content, and public page branding." />
    <nav className="flex flex-wrap gap-2" aria-label="Website settings sections">{[{ id: "settings", label: "Site settings" }, { id: "branding", label: "Public branding" }].map((item) => <Link key={item.id} href={`/admin/site?tab=${item.id}`}><AdminButton variant={section === item.id ? "primary" : "outline"} aria-current={section === item.id ? "page" : undefined}>{item.label}</AdminButton></Link>)}</nav>
    {section === "branding" ? <BrandingForm initial={branding} /> : <SiteForm site={site} turnstile={turnstile} />}
  </div>;
}

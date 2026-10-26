import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { loadAdminThemeSettings, adminSettingsSection } from "@/lib/admin/site-admin";
import { THEME_PRESETS } from "@/lib/tap/themes";
import { PageHeader } from "@/components/admin/ui/primitives";
import { AdminButton } from "@/components/admin/ui/controls";
import { AdminThemesForm } from "./themes-form";
import { PresetForm } from "../presets/preset-form";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  await requireAdminPage();
  const params = await searchParams;
  const section = adminSettingsSection(params.tab, ["themes", "presets"], "themes");
  const { extra, code, saved } = await loadAdminThemeSettings();
  return <div className="space-y-5"><PageHeader title="Tap themes" subtitle="Set available looks and save starter button presets for each business type." />
    <nav className="flex flex-wrap gap-2" aria-label="Tap theme sections">{[{ id: "themes", label: "Themes" }, { id: "presets", label: "Industry presets" }].map((item) => <Link key={item.id} href={`/admin/themes?tab=${item.id}`}><AdminButton variant={section === item.id ? "primary" : "outline"} aria-current={section === item.id ? "page" : undefined}>{item.label}</AdminButton></Link>)}</nav>
    {section === "presets" ? <PresetForm code={code} saved={saved} /> : <AdminThemesForm presets={THEME_PRESETS} extra={extra} />}
  </div>;
}

import { requireAdminPage } from "@/lib/admin";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { THEME_PRESETS } from "@/lib/tap/themes";
import { AdminThemesForm } from "./themes-form";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  await requireAdminPage();
  const extra = await readAdminThemes();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Tap themes</h1>
        <p className="text-sm text-muted-foreground">
          Built-in themes stay in the app. Extra themes here show up in every business theme picker.
        </p>
      </div>
      <AdminThemesForm presets={THEME_PRESETS} extra={extra} />
    </div>
  );
}

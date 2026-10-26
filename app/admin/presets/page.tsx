import { requireAdminPage } from "@/lib/admin";
import { loadAdminThemeSettings } from "@/lib/admin/site-admin";
import { PresetForm } from "./preset-form";

export const dynamic = "force-dynamic";

export default async function AdminPresetsPage() {
  await requireAdminPage();
  const { code, saved } = await loadAdminThemeSettings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Industry presets</h1>
        <p className="text-sm text-muted-foreground">
          A new business copies the saved buttons for its category. Built-in sets are used until you save one.
        </p>
      </div>
      <PresetForm
        code={code}
        saved={saved}
      />
    </div>
  );
}

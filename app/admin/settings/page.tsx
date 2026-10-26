import { PageHeader } from "@/components/admin/ui/primitives";
import { loadAdminSettings } from "@/lib/admin/settings-admin";
import { requireAdminPage } from "@/lib/admin";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireAdminPage();
  const settings = await loadAdminSettings(user.id!);
  if (!settings.ok) return <p className="text-sm text-rose-600">{settings.error}</p>;
  return (
    <div>
      <PageHeader title="Settings" subtitle="Maintenance, team caps, TDS, flags, and notification choices." />
      <SettingsForm initial={settings.data} />
    </div>
  );
}

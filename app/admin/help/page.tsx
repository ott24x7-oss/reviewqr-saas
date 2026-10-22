import { requireAdminPage } from "@/lib/admin";
import { HelpManager } from "@/components/admin/help-manager";

export const dynamic = "force-dynamic";

export default async function AdminHelpPage() {
  await requireAdminPage();
  return <HelpManager />;
}

import { requireAdminPage } from "@/lib/admin";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <AdminShell user={{ name: user.name ?? null, email: user.email!, image: user.image ?? null }}>
      {children}
    </AdminShell>
  );
}

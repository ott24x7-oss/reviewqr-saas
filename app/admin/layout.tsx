import { requireAdminPage } from "@/lib/admin";
import { adminShellCounts } from "@/lib/admin/inbox";
import { AdminShell } from "@/components/admin/ui/shell";
import { getBrand } from "@/lib/brand";
import "@/components/admin/ui/theme.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const [brand, counts] = await Promise.all([getBrand(), adminShellCounts()]);
  return (
    <AdminShell
      user={{ name: user.name ?? null, email: user.email!, image: user.image ?? null }}
      brand={brand}
      inbox={counts.inbox}
      counts={counts}
      envLabel={process.env.NODE_ENV === "production" ? "LIVE" : "STAGING"}
    >
      {children}
    </AdminShell>
  );
}

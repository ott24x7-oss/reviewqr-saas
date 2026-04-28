import { requireAdminPage } from "@/lib/admin";
import { AdminShell } from "@/components/admin/shell";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, brand] = await Promise.all([requireAdminPage(), getBrand()]);
  return (
    <AdminShell
      user={{ name: user.name ?? null, email: user.email!, image: user.image ?? null }}
      brand={brand}
    >
      {children}
    </AdminShell>
  );
}

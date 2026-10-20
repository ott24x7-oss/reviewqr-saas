import { redirect } from "next/navigation";
import { getDashboardViewer } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { prisma } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { readableBusinessWhere } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const view = await getDashboardViewer();
  if (!view) redirect("/login?callbackUrl=/dashboard");
  const user = view.user;

  const [businesses, brand] = await Promise.all([
    prisma.business.findMany({
      where: readableBusinessWhere(user.id),
      select: { id: true, name: true, slug: true, logo: true },
      orderBy: { createdAt: "asc" }
    }),
    getBrand()
  ]);

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        tier: user.subscriptionTier,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
        emailVerified: !!user.emailVerified
      }}
      businesses={businesses}
      brand={brand}
      impersonation={view.impersonation}
    >
      {children}
    </DashboardShell>
  );
}

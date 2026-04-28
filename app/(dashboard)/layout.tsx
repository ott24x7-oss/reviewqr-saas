import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { prisma } from "@/lib/db";
import { getBrand } from "@/lib/brand";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [businesses, brand] = await Promise.all([
    prisma.business.findMany({
      where: { ownerId: user.id, archived: false },
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
        subscriptionEndsAt: user.subscriptionEndsAt
      }}
      businesses={businesses}
      brand={brand}
    >
      {children}
    </DashboardShell>
  );
}

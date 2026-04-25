import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    select: { id: true, name: true, slug: true, logo: true },
    orderBy: { createdAt: "asc" }
  });

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
    >
      {children}
    </DashboardShell>
  );
}

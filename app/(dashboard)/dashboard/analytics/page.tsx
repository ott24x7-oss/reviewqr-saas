import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { AnalyticsBoard } from "@/components/dashboard/analytics-board";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/analytics");
  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" }
  });
  return <AnalyticsBoard businesses={businesses} />;
}

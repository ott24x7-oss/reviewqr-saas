import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { AnalyticsBoard } from "@/components/dashboard/analytics-board";
import { requireAccountFeatureForRoute } from "@/lib/plans/dashboard-gate";
import { LockedFeature } from "@/components/app-ui/locked-feature";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/analytics");
  const locked = await requireAccountFeatureForRoute(user.id, "/dashboard/analytics", "analytics");
  if (locked) return <LockedFeature state={locked} />;
  const pdfReportLock = await requireAccountFeatureForRoute(user.id, "/api/v1/reports/monthly", "pdf-report");
  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" }
  });
  return <AnalyticsBoard businesses={businesses} pdfReportLock={pdfReportLock} />;
}

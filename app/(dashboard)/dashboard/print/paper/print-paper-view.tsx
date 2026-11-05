import { redirect } from "next/navigation";
import Paper from "@/app/admin/print/paper/page";
import { LockedFeature } from "@/components/app-ui/locked-feature";
import { getCurrentUser } from "@/lib/auth";
import { requireAccountFeatureForRoute, requireFeatureForRoute } from "@/lib/plans/dashboard-gate";

export default async function PrintPaperView({ ownerId }: { ownerId?: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const route = "/dashboard/print/paper";
  const locked = ownerId
    ? await requireFeatureForRoute(ownerId, route, "multiple-qrs")
    : await requireAccountFeatureForRoute(user.id, route, "multiple-qrs");
  if (locked) return <LockedFeature state={locked} />;
  return <Paper />;
}

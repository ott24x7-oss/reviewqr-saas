import { getPlanProgramSettings } from "@/lib/plans/settings";
import { RewardForm } from "./reward-form";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const settings = await getPlanProgramSettings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Referral rewards</h1>
        <p className="text-sm text-muted-foreground">
          Months are added to the referrer after the new business pays and the hold passes. A trial is not a paid plan, so the months wait as credit.
        </p>
      </div>
      <RewardForm initial={settings} />
    </div>
  );
}

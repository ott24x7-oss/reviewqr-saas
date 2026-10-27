import Link from "next/link";
import { PageHeader } from "@/components/admin/ui/primitives";
import { loadPlanBoardRows } from "@/lib/admin/plan-rows";
import { getPricingCopy } from "@/lib/plans/pricing-copy";
import { getPricingConfig } from "@/lib/settings";
import { PlansBoard } from "./plans-board";
import { PricingCopyForm } from "../pricing/pricing-copy-form";
import { PricingForm } from "../pricing/pricing-form";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const copy = searchParams?.tab === "copy";
  const plans = copy ? [] : await loadPlanBoardRows();
  const [pricing, pricingCopy] = copy ? await Promise.all([getPricingConfig(), getPricingCopy()]) : [null, null];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans & pricing"
        subtitle="Module plans, prices, and the public pricing page."
        actions={
          <div className="flex gap-2 text-sm">
            <Link className={copy ? "text-zinc-500" : "font-medium"} href="/admin/plans">Plans</Link>
            <Link className={copy ? "font-medium" : "text-zinc-500"} href="/admin/plans?tab=copy">Pricing copy</Link>
          </div>
        }
      />
      {copy && pricing && pricingCopy ? (
        <div className="space-y-5">
          <PricingForm initial={pricing} />
          <PricingCopyForm initial={pricingCopy} />
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Build a plan or a combo by ticking modules. Archived plans stay on the accounts that already bought them.
            Drag a row to change the pricing-page order.
          </p>
          <PlansBoard plans={plans} />
        </>
      )}
    </div>
  );
}

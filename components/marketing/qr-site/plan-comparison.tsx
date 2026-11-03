import { Check } from "lucide-react";
import type { PublicPlan } from "@/lib/plans/public";
import { SectionHeading } from "./primitives";

export function PlanComparison({ plans }: { plans: PublicPlan[] }) {
  const rows: Array<{ en: string; hi: string }> = [];
  for (const plan of plans) {
    for (const bullet of plan.bullets) {
      if (!bullet.compare || rows.some((row) => row.en === bullet.en)) continue;
      rows.push({ en: bullet.en, hi: bullet.hi });
    }
  }
  if (!plans.length || !rows.length) return null;

  return (
    <section className="qr-section qr-compare-section">
      <div className="qr-wrap">
        <SectionHeading number="08" eyebrow="Find the right fit" title="Compare plans" />
        <div className="qr-compare-table-wrap">
          <table className="qr-compare-table">
            <thead><tr><th scope="col">Feature</th>{plans.map((plan) => <th scope="col" key={plan.slug}>{plan.nameEn}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row.en}>
                <th scope="row">{row.en}</th>
                {plans.map((plan) => {
                  const included = plan.bullets.some((bullet) => bullet.compare && bullet.en === row.en);
                  return <td key={plan.slug}>{included ? <Check size={17} aria-label="Included" /> : <span aria-label="Not included">—</span>}</td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import { Fragment } from "react";
import { Check } from "lucide-react";
import { comparisonFeatureOrder, comparisonGroupForFeature, isMarketingFeature, isPlanFeatureAvailable } from "@/lib/plans/comparison";
import type { PublicPlan } from "@/lib/plans/public";
import { SectionHeading } from "./primitives";
import type { SeoLocale } from "@/lib/seo";
import { LocalizedCopy } from "./i18n";

const LIMIT_ROWS: Array<{ key: keyof PublicPlan["limits"]; en: string; hi: string }> = [
  { key: "businesses", en: "Businesses", hi: "व्यवसाय" },
  { key: "qrCodes", en: "QR codes", hi: "QR कोड" },
  { key: "locations", en: "Locations", hi: "लोकेशन" },
  { key: "staff", en: "Staff logins", hi: "स्टाफ़ लॉगिन" },
  { key: "products", en: "Menu / store items", hi: "मेनू / स्टोर आइटम" },
  { key: "aiCalls", en: "AI replies / month", hi: "प्रति माह AI जवाब" }
];

const GROUPS = [
  { id: "REVIEWS", en: "Reviews", hi: "रिव्यू" },
  { id: "MENU", en: "Menu", hi: "मेनू" },
  { id: "STORE", en: "WhatsApp Store", hi: "व्हाट्सऐप स्टोर" }
] as const;

function GroupHeading({ en, hi, colSpan, locale }: { en: string; hi: string; colSpan: number; locale: SeoLocale }) {
  return <tr className="qr-compare-group"><th scope="rowgroup" colSpan={colSpan}>{locale === "hi" ? hi : en}</th></tr>;
}

function BilingualLabel({ en, hi, locale }: { en: string; hi: string; locale: SeoLocale }) {
  return <span className="qr-compare-label">{locale === "hi" ? hi : en}</span>;
}

export function PlanComparison({ plans, locale = "en" }: { plans: PublicPlan[]; locale?: SeoLocale }) {
  const rows: Array<{ en: string; hi: string; group: string | null }> = [];
  for (const plan of plans) {
    for (const bullet of plan.bullets) {
      if (!bullet.compare || !isMarketingFeature(bullet.en) || rows.some((row) => row.en === bullet.en)) continue;
      rows.push({ en: bullet.en, hi: bullet.hi, group: comparisonGroupForFeature(bullet.en) });
    }
  }
  if (!plans.length) return null;

  const groupedRows = [
    ...GROUPS.map((group) => ({
      ...group,
      rows: rows.filter((row) => row.group === group.id).sort((a, b) => comparisonFeatureOrder(a.en) - comparisonFeatureOrder(b.en))
    })),
    { id: "OTHER", en: "Other features", hi: "अन्य सुविधाएँ", rows: rows.filter((row) => row.group === null) }
  ].filter((group) => group.rows.length);

  return (
    <LocalizedCopy locale={locale}><section className="qr-section qr-compare-section">
      <div className="qr-wrap">
        <SectionHeading number="08" eyebrow="Find the right fit" title="Compare plans" />
        <div className="qr-compare-table-wrap">
          <table className="qr-compare-table">
            <thead><tr><th scope="col">{locale === "hi" ? "सुविधा" : "Feature"}</th>{plans.map((plan) => <th scope="col" key={plan.slug}>{locale === "hi" ? plan.nameHi : plan.nameEn}</th>)}</tr></thead>
            <tbody>
              <GroupHeading en="Limits" hi="सीमाएँ" colSpan={plans.length + 1} locale={locale} />
              {LIMIT_ROWS.map((row) => <tr key={row.key}>
                <th scope="row"><BilingualLabel en={row.en} hi={row.hi} locale={locale} /></th>
                {plans.map((plan) => {
                  const value = plan.limits[row.key];
                  return <td key={plan.slug}>{value === 0 && row.key !== "aiCalls" ? <span className="qr-compare-excluded" role="img" aria-label="Limit is zero">—</span> : value.toLocaleString("en-US")}</td>;
                })}
              </tr>)}
              {groupedRows.map((group) => <Fragment key={group.id}>
                <GroupHeading en={group.en} hi={group.hi} colSpan={plans.length + 1} locale={locale} />
                {group.rows.map((row) => <tr key={row.en}>
                  <th scope="row"><BilingualLabel en={row.en} hi={row.hi} locale={locale} /></th>
                  {plans.map((plan) => {
                    const included = plan.bullets.some((bullet) => bullet.compare && bullet.en === row.en) && isPlanFeatureAvailable(row.en, plan);
                    return <td key={plan.slug}>{included ? <Check size={17} aria-label="Included" /> : <span className="qr-compare-excluded" role="img" aria-label="Not included">—</span>}</td>;
                  })}
                </tr>)}
              </Fragment>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

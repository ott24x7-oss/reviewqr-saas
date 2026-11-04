import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/reseller-terms", title: SEO_STATIC_ROUTES[9].titleEn, description: routeDescription("/reseller-terms", "en") });
}

export default function ResellerTermsPage() {
  return (
    <LegalPage path="/reseller-terms" breadcrumbName="Reseller terms" eyebrow="QR24x7" title="Reseller terms" intro="These terms explain how QR24x7 reseller commissions and payouts work.">
      <p>There is no joining fee. Applying does not guarantee approval or a particular amount of income.</p>
      <h2>Commission</h2>
      <p>Commission is earned on eligible paid plan purchases and QR24x7 shop orders attributed to your reseller account. The active commission rules determine the amount. Commission examples shown in the app are estimates based on the settings shown when you view them.</p>
      <p>Inviting or recruiting people does not earn a commission. Refunds, chargebacks, cancellations, or other reversals remove the related commission.</p>
      <h2>Payouts</h2>
      <p>Before payout, complete the payout details requested in your agent profile, including required identity and bank or UPI details. QR24x7 sends eligible payouts to the verified payout method after review and any required tax withholding.</p>
      <h2>Changes and conduct</h2>
      <p>QR24x7 may change commission rules for future sales and may pause or end reseller access for misuse. Existing commission records remain subject to their recorded sale terms and reversal rules.</p>
    </LegalPage>
  );
}

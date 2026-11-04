import type { Metadata } from "next";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { ComparisonPage } from "@/components/marketing/comparison-page";
import { getBrand } from "@/lib/brand";
import { COMPARISON_PATH, comparisonCopy } from "@/lib/comparison";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const copy = comparisonCopy("en");
  return buildSeoMetadata({ path: COMPARISON_PATH, title: copy.title, description: copy.intro, ogContext: "WhatsApp ordering cost comparison" });
}
export default async function CommissionFreeWhatsAppPage() {
  const brand = await getBrand();
  return <SiteShell brand={brand} path={COMPARISON_PATH} includeBreadcrumb={false}><ComparisonPage locale="en" /></SiteShell>;
}

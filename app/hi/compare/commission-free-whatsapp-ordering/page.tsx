import type { Metadata } from "next";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { ComparisonPage } from "@/components/marketing/comparison-page";
import { getBrand } from "@/lib/brand";
import { COMPARISON_PATH, comparisonCopy } from "@/lib/comparison";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const copy = comparisonCopy("hi");
  return buildSeoMetadata({ path: COMPARISON_PATH, locale: "hi", title: copy.title, description: copy.intro, ogContext: "WhatsApp ऑर्डर लागत की तुलना" });
}
export default async function HindiCommissionFreeWhatsAppPage() {
  const brand = await getBrand();
  return <SiteShell brand={brand} locale="hi" path={COMPARISON_PATH} includeBreadcrumb={false}><ComparisonPage locale="hi" /></SiteShell>;
}

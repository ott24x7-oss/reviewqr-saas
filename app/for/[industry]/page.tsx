import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { IndustryContent } from "@/components/industry/industry-content";
import { getBrand } from "@/lib/brand";
import { getSeoConfig, getSupportWhatsApp } from "@/lib/settings";
import { industryCategory, industryCopy, type IndustrySlug } from "@/lib/industry-pages";
import { getDirectoryInventory } from "@/lib/local-seo";
import { listPublicPlans } from "@/lib/plans/public";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Params = { industry: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = industryCategory(params.industry);
  if (!category) return { title: "Page not found", robots: { index: false, follow: false } };
  const copy = industryCopy(category.slug as IndustrySlug, "en");
  return buildSeoMetadata({ path: `/for/${category.slug}`, title: copy.h1, description: copy.intro, ogContext: category.en });
}

export default async function IndustryPage({ params }: { params: Params }) {
  const category = industryCategory(params.industry);
  if (!category) notFound();
  const [brand, plans, seo, whatsapp] = await Promise.all([getBrand(), listPublicPlans(), getSeoConfig(), getSupportWhatsApp()]);
  const inventory = await getDirectoryInventory(seo.localPages);
  return <SiteShell brand={brand} locale="en" path={`/for/${category.slug}`} includeBreadcrumb={false} whatsapp={whatsapp}>
    <IndustryContent slug={category.slug as IndustrySlug} locale="en" plans={plans} inventory={inventory} minBusinesses={seo.localPages.minBusinessesPerPage} />
  </SiteShell>;
}

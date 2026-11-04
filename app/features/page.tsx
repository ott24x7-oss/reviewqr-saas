import type { Metadata } from "next";
import { FeaturesMarketing } from "@/components/marketing/qr-site/marketing-pages";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingConfig } from "@/lib/settings";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/features", title: SEO_STATIC_ROUTES[1].titleEn, description: routeDescription("/features", "en") });
}

export default async function FeaturesPage() {
  const locale = getRequestLocale();
  const [catalog, legacy, brand] = await Promise.all([listPublicPlans(), getPricingConfig(), getBrand()]);
  return <SiteShell brand={brand} locale={locale} path="/features"><FeaturesMarketing plans={catalog} legacy={legacy} locale={locale} /></SiteShell>;
}

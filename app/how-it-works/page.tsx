import type { Metadata } from "next";
import { HowItWorksMarketing } from "@/components/marketing/qr-site/marketing-pages";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/how-it-works", title: SEO_STATIC_ROUTES[2].titleEn, description: routeDescription("/how-it-works", "en") });
}

export default async function HowItWorksPage() {
  const locale = getRequestLocale();
  const brand = await getBrand();
  return <SiteShell brand={brand} locale={locale} path="/how-it-works"><HowItWorksMarketing brand={brand} startHref="/register" locale={locale} /></SiteShell>;
}

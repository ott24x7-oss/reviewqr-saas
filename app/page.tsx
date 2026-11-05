import type { Metadata } from "next";
import { LegacyHashRedirect } from "@/components/marketing/qr-site/legacy-hash-redirect";
import { HomeMarketing, homeFaqsWithReviewPolicy } from "@/components/marketing/qr-site/marketing-pages";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { listActivePlanPrices, listPublicPlans } from "@/lib/plans/public";
import { buyHref } from "@/lib/plans/categories";
import { freePlanOffer } from "@/lib/landing/anchor";
import { getBrand } from "@/lib/brand";
import { talkToUsHref } from "@/lib/landing/money";
import { landingTrust } from "@/lib/landing/proof";
import { landingPhotoCredits } from "@/lib/landing/credits";
import { landingStories } from "@/lib/landing/stories";
import { listStandAddons } from "@/lib/landing/hardware";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { getRequestLocale } from "@/lib/locale";
import { HomeStructuredData } from "@/components/marketing/qr-site/structured-data";
import { getPricingCopy } from "@/lib/plans/pricing-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/", title: SEO_STATIC_ROUTES[0].titleEn, description: routeDescription("/", "en"), image: "/landing/og-1600.webp" });
}

export default async function HomePage() {
  const locale = getRequestLocale();
  const [catalog, priced, brand, trust, hardware, copy] = await Promise.all([
    listPublicPlans(),
    listActivePlanPrices(),
    getBrand(),
    landingTrust(),
    listStandAddons(),
    getPricingCopy()
  ]);
  const free = freePlanOffer(priced);
  const startHref = free ? buyHref(free.slug, free.duration) : "/register";
  const whatsapp = await talkToUsHref();
  const homeFaqs = homeFaqsWithReviewPolicy(copy.faqs);

  return (
    <SiteShell brand={brand} startHref={startHref} whatsapp={whatsapp} credits={landingPhotoCredits()} locale={locale} path="/">
      <HomeStructuredData locale={locale} faqs={homeFaqs} />
      <LegacyHashRedirect />
      <HomeMarketing
        brand={brand}
        trust={trust}
        startHref={startHref}
        whatsapp={whatsapp}
        plans={catalog}
        hardware={hardware}
        stories={landingStories()}
        faqs={homeFaqs}
        locale={locale}
      />
    </SiteShell>
  );
}

import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { LegacyHashRedirect } from "@/components/marketing/landing/legacy-hash-redirect";
import { Comparison, FaqV2, CtaV2 } from "@/components/marketing/landing/sections";
import type { Metadata } from "next";
import { listActivePlanPrices, listPublicPlans } from "@/lib/plans/public";
import { buyHref } from "@/lib/plans/categories";
import { freePlanOffer, priceAnchor } from "@/lib/landing/anchor";
import { getBrand } from "@/lib/brand";
import { marketingFontClass } from "@/components/brand/fonts";
import { talkToUsHref } from "@/lib/landing/money";
import { landingQuotes, landingTrust } from "@/lib/landing/proof";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { SellHero, StickyBuy } from "@/components/marketing/landing-v2/sell-hero";
import { ProductGrid } from "@/components/marketing/landing-v2/product-grid";
import { HowTeaser, LiveDemo, RealTestimonials, UseCases } from "@/components/marketing/landing-v2/story";
import { listStandAddons } from "@/lib/landing/hardware";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const title = `${brand.name} — ${brand.tagline}`;
  const description = `${brand.tagline}. Google reviews, menu and WhatsApp orders from one QR + NFC stand. No commission. Setup in 10 minutes. Made in India.`;
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/landing/og-1600.webp", width: 1200, height: 630, alt: "QR and NFC stand on a café counter" }]
    }
  };
}

export default async function HomePage() {
  const [catalog, priced, brand, trust, hardware, quotes] = await Promise.all([
    listPublicPlans(),
    listActivePlanPrices(),
    getBrand(),
    landingTrust(),
    listStandAddons(),
    landingQuotes()
  ]);
  const anchor = priceAnchor(catalog);
  const free = freePlanOffer(priced);
  const whatsapp = talkToUsHref();
  return (
    <LandingLangProvider>
    <main className={`marketing-page relative min-h-screen overflow-x-hidden pb-24 ${marketingFontClass}`}>
      <link rel="preload" as="image" href="/landing/hero-800.webp" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/landing/hero-1600.webp" media="(min-width: 768px)" fetchPriority="high" />
      <MarketingNavbar brand={brand} />
      <LegacyHashRedirect />

      <SellHero
        anchor={anchor}
        trust={trust}
        whatsapp={whatsapp}
        freeHref={free ? buyHref(free.slug, free.duration) : null}
        tagline={brand.tagline}
      />
      <StickyBuy anchor={anchor} whatsapp={whatsapp} />
      <ProductGrid plans={catalog} hardware={hardware} />
      <LiveDemo />
      <UseCases />
      <HowTeaser />
      <RealTestimonials quotes={quotes} />
      <Comparison />
      <FaqV2 />
      <CtaV2 />

      <Footer brand={brand} />
    </main>
    </LandingLangProvider>
  );
}

import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { FeatureStory } from "@/components/marketing/landing/feature-story";
import { marketingFontClass } from "@/components/brand/fonts";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const description = "Reviews, menu, WhatsApp store, profile page, QR and NFC stands, and growth tools on one stand.";
  return {
    title: { absolute: `Features | ${brand.name}` },
    description,
    openGraph: {
      title: `Features | ${brand.name}`,
      description,
      images: ["/landing/og-1600.webp"]
    }
  };
}

export default async function FeaturesPage() {
  const [catalog, legacy, brand] = await Promise.all([listPublicPlans(), getPricingConfig(), getBrand()]);
  return (
    <LandingLangProvider>
      <main className={`marketing-page relative min-h-screen overflow-x-hidden ${marketingFontClass}`}>
        <MarketingNavbar brand={brand} />
        <FeatureStory catalog={catalog} legacy={legacy} />
        <Footer brand={brand} />
      </main>
    </LandingLangProvider>
  );
}

import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { marketingFontClass } from "@/components/brand/fonts";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { HowSteps } from "@/components/marketing/landing-v2/how-steps";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const description = "Choose a plan, get a QR + NFC stand, set up in 10 minutes, and track reviews and WhatsApp orders.";
  return {
    title: { absolute: `How it works | ${brand.name}` },
    description,
    openGraph: {
      title: `How it works | ${brand.name}`,
      description,
      images: ["/landing/og-1600.webp"]
    }
  };
}

export default async function HowItWorksPage() {
  const brand = await getBrand();
  return (
    <LandingLangProvider>
      <main className={`marketing-page min-h-screen overflow-x-hidden px-4 py-8 ${marketingFontClass}`}>
        <MarketingNavbar brand={brand} />
        <div className="mt-6">
          <HowSteps />
        </div>
        <div className="mt-16">
          <Footer brand={brand} />
        </div>
      </main>
    </LandingLangProvider>
  );
}

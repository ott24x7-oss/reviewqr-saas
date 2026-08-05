import { MarketingNavbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";
import { FAQ } from "@/components/marketing/faq";
import { CTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, brand] = await Promise.all([getPricingConfig(), getBrand()]);
  return (
    <main className="relative min-h-screen">
      {/* Static dot-grid background — uniform gray dots on a light-gray backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[#f1f2f4]"
        style={{
          backgroundImage: "radial-gradient(rgba(148,163,184,0.55) 1.1px, transparent 1.1px)",
          backgroundSize: "22px 22px"
        }}
      />
      <MarketingNavbar brand={brand} />
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />
      <Pricing plans={plans} />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer brand={brand} />
    </main>
  );
}

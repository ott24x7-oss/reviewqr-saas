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
import DotField from "@/components/ui/dot-field";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, brand] = await Promise.all([getPricingConfig(), getBrand()]);
  return (
    <main className="relative min-h-screen">
      {/* Interactive dot-field background (React Bits) — uniform gray dots on a light-gray backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#f1f2f4]">
        <DotField
          dotRadius={2}
          dotSpacing={20}
          bulgeStrength={60}
          cursorRadius={480}
          glowRadius={160}
          gradientFrom="rgba(148, 163, 184, 0.6)"
          gradientTo="rgba(148, 163, 184, 0.6)"
          glowColor="#334155"
        />
      </div>
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

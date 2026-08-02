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
      {/* Interactive dot-field background (React Bits), tuned for the light theme */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <DotField
          dotRadius={1.6}
          dotSpacing={16}
          bulgeStrength={75}
          cursorRadius={450}
          glowRadius={150}
          gradientFrom="rgba(52, 199, 123, 0.45)"
          gradientTo="rgba(37, 99, 235, 0.28)"
          glowColor="#34C77B"
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

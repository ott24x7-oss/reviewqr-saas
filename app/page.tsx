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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plans = await getPricingConfig();
  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />
      <Pricing plans={plans} />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

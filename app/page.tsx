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
      {/* Darkish wash over the grid so the page reads less transparent */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-slate-400/20" />

      <MarketingNavbar brand={brand} />

      {/* Boxed sections — solid cards on the gridded backdrop */}
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-5 sm:space-y-7">
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <Hero />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <Features />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <HowItWorks />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <DashboardPreview />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <Pricing plans={plans} />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <Testimonials />
        </section>
        <section className="rounded-[2rem] bg-white border border-slate-200/80 shadow-[0_18px_50px_-20px_rgba(30,41,59,0.35)] overflow-hidden">
          <FAQ />
        </section>
        <section className="rounded-[2rem] overflow-hidden shadow-[0_18px_50px_-20px_rgba(30,41,59,0.4)]">
          <CTA />
        </section>
      </div>

      <Footer brand={brand} />
    </main>
  );
}

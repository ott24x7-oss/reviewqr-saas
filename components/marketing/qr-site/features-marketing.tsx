import dynamic from "next/dynamic";
import type { PublicPlan } from "@/lib/plans/public";
import { PlanComparison } from "./plan-comparison";
import { Eyebrow, PageIntro, PhoneScreenshot, SectionHeading, TextLink } from "./primitives";
import { FeatureRows, HOME_STEPS } from "./marketing-pages";
import { LocalizedCopy } from "./i18n";
import type { SeoLocale } from "@/lib/seo";

const PricingCards = dynamic(() => import("./pricing").then((module) => module.PricingCards), { ssr: true });
export function FeaturesMarketing({
  plans,
  legacy,
  locale = "en"
}: {
  plans: PublicPlan[];
  legacy: import("@/lib/settings").PricingConfig;
  locale?: SeoLocale;
}) {
  return (
    <LocalizedCopy locale={locale}><>
      <PageIntro id="story" eyebrow="A product for the whole customer journey" title={<>A QR code for Google reviews, a digital menu, and WhatsApp orders.</>} description="Give customers a useful page to land on, then follow scans, reviews, menus and orders from the QR24x7 Android app." />
      <section id="features" className="qr-section qr-features-section qr-feature-page-section">
        <div className="qr-wrap">
          <SectionHeading number="01" eyebrow="Product features" title="Set up once. Keep the page useful." />
          <FeatureRows locale={locale} />
          <div className="qr-app-facts">
            <article><Eyebrow>IN THE ANDROID APP</Eyebrow><h3>Your page and plan settings</h3><p>Manage your page, plan and setup checklist from the app.</p><PhoneScreenshot src="/landing/app/me.webp" alt="QR24x7 Android app page and plan settings" sizes="(max-width: 760px) 220px, 270px" /></article>
            <article><Eyebrow>IN THE ANDROID APP</Eyebrow><h3>Review requests</h3><p>Use the review page to invite feedback and open your public review link.</p><PhoneScreenshot src="/landing/app/reviews.webp" alt="QR24x7 Android app review requests" sizes="(max-width: 760px) 220px, 270px" /></article>
          </div>
          <div id="growth" className="qr-feature-links">
            <article><h3>Refer and earn free months</h3><p>Eligible referrals can earn free plan months after a paid purchase.</p><TextLink href="/dashboard/refer">Referral details</TextLink></article>
            <article><h3>Reseller program</h3><p>Apply to resell QR24x7 plans and stands. Commission depends on current rules and approval.</p><TextLink href="/dashboard/agent-apply">Apply as a reseller</TextLink></article>
          </div>
          <section id="industries" className="qr-industry-note">
            <Eyebrow>MADE FOR LOCAL BUSINESS</Eyebrow>
            <p>Cafés, salons, clinics, restaurants, gyms and shops can keep their customer page, reviews and orders together.</p>
          </section>
        </div>
      </section>
      <PricingCards id="plans-list" plans={plans} legacy={legacy} locale={locale} title="Choose what to use" description="Plans and current prices are loaded from the QR24x7 catalog." />
      <PlanComparison plans={plans} locale={locale} />
      <section id="how" className="qr-section qr-process-section">
        <div className="qr-wrap">
          <div className="qr-section-heading qr-heading-split"><div><Eyebrow>03 / HOW IT WORKS</Eyebrow><h2>Order a stand, set up, then let customers scan or tap.</h2></div><p>LEAVES YOU WITH</p></div>
          <ol className="qr-process-grid">{HOME_STEPS.map((step) => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
          <div className="qr-process-link"><TextLink href="/how-it-works#demo">Watch the demo</TextLink><span className="qr-link-gap" /><TextLink href="/#pricing">See pricing</TextLink></div>
        </div>
      </section>
    </></LocalizedCopy>
  );
}

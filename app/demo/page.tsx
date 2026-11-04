import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  Copy,
  ExternalLink,
  ScanLine,
  Smartphone,
  Sparkles,
  Star,
  ThumbsUp
} from "lucide-react";
import { SiteShell, PageIntro, Eyebrow } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";
import { absoluteUrl } from "@/lib/utils";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { LocalizedCopy } from "@/components/marketing/qr-site/i18n";
import { getRequestLocale } from "@/lib/locale";

const DEMO_QR_IMAGE = "https://i.ibb.co/Y7RWPMK5/QR-pay.png";

const steps = [
  {
    icon: ScanLine,
    title: "Customer scans the QR",
    body: "Print on table tents, billboards, bills, or business cards. They land on a mobile-first review page in under a second."
  },
  {
    icon: Star,
    title: "They tap a star to rate",
    body: "Every rating then shows the public review link and a private note, in the same order."
  },
  {
    icon: ThumbsUp,
    title: "They write their own words",
    body: "Short topic hints can be tapped into their text. If AI is on, it suggests a cleanup. They can edit it before copying. Nothing is posted for them."
  },
  {
    icon: Copy,
    title: "They open the public link themselves",
    body: "The Google or Trustpilot link stays on the page. If they copied a suggestion, they paste it on that form themselves."
  },
  {
    icon: Bell,
    title: "You get a WhatsApp ping",
    body: "A private note from a low rating alerts the owner on WhatsApp and email. The public link stays visible on that same screen."
  }
];

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/demo", title: SEO_STATIC_ROUTES[5].titleEn, description: routeDescription("/demo", "en") });
}

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const locale = getRequestLocale();
  const brand = await getBrand();
  const demoReviewUrl = absoluteUrl("/r/ensofter");
  return (
    <SiteShell brand={brand} locale={locale} path="/demo">
      <LocalizedCopy locale={locale}><>
      <PageIntro eyebrow="Live demo" title={<>See it on your phone <em>right now.</em></>} description="Scan the QR below — or use the live embed underneath — to walk through the full customer flow. The demo is the same page your customers will get." />

      <section className="qr-demo-section">
        <div className="qr-wrap qr-demo-grid">
          <div>
            <Eyebrow>STEP 1 — SCAN</Eyebrow>
            <h2>Point your camera at the QR.</h2>
            <p>Open the camera app on your phone and aim at the QR. You’ll be taken to a real, fully working review page for our demo business — <strong>Ensofter Solutions</strong>.</p>
            <ul className="qr-demo-list">
              <li><Smartphone size={17} aria-hidden="true" /> Works on iPhone and Android — no app install. Just the camera.</li>
              <li><Star size={17} aria-hidden="true" /> Try 5 stars and 2 stars. The public link and private note stay in the same order.</li>
              <li><ThumbsUp size={17} aria-hidden="true" /> Write a few words. An AI cleanup, when enabled, is only an editable suggestion.</li>
            </ul>
            <Link className="qr-button qr-button-dark" href={demoReviewUrl} target="_blank" rel="noopener noreferrer">Open demo in a new tab <ExternalLink size={16} /></Link>
          </div>
          <div className="qr-demo-qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_QR_IMAGE} alt="Demo QR — scan to open the review page" />
            <span>Scan to try</span>
            <strong>Ensofter Solutions · Demo</strong>
          </div>
        </div>
      </section>

      <section className="qr-section qr-how-demo">
        <div className="qr-wrap">
          <div className="qr-section-heading is-centered">
            <Eyebrow>STEP 2 — OR TRY IT HERE</Eyebrow>
            <h2>The same page, embedded.</h2>
            <p>No phone handy? Click around in the live preview below — it’s the actual review page, fully interactive.</p>
          </div>
          <div className="qr-demo-frame">
            <iframe src={demoReviewUrl} title="QR24x7 live demo" loading="lazy" />
          </div>
          <p className="qr-demo-caption">Embedded preview of <a href={demoReviewUrl} target="_blank" rel="noopener noreferrer">{demoReviewUrl.replace(/^https?:\/\//, "")}</a></p>
        </div>
      </section>

      <section className="qr-section">
        <div className="qr-wrap qr-demo-guide">
          <div className="qr-section-heading is-centered">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2>From a QR scan to a real Google or Trustpilot review.</h2>
            <p>Five steps end-to-end. Steps 1–4 happen in roughly 30 seconds on the customer’s phone. Step 5 is automatic — for you.</p>
          </div>
          <ol className="qr-demo-steps">
            {steps.map((step, index) => <li key={step.title}>
              <span><step.icon size={18} aria-hidden="true" /></span>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
              {index < steps.length - 1 ? <Check className="qr-demo-step-check" size={16} aria-hidden="true" /> : null}
            </li>)}
          </ol>
        </div>
      </section>

      <section className="qr-section qr-standalone-cta">
        <div className="qr-wrap">
          <Sparkles size={22} aria-hidden="true" />
          <h2>Ready to try it with your own business?</h2>
          <p>Add your Google or Trustpilot review URL, generate a QR for your counter, and start collecting reviews today. Free trial — no card needed.</p>
          <div className="qr-demo-cta-actions">
            <Link href="/register" className="qr-button qr-button-light">Start free trial <ArrowRight size={16} /></Link>
            <Link href={`${locale === "hi" ? "/hi" : ""}#pricing`} className="qr-button qr-button-outline-light">See pricing</Link>
          </div>
        </div>
      </section>
      </></LocalizedCopy>
    </SiteShell>
  );
}

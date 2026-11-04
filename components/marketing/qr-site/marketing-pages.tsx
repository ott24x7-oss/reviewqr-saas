import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import type { Brand } from "@/lib/brand";
import type { LandingTrust } from "@/lib/landing/proof";
import type { OwnerStory } from "@/lib/landing/stories";
import type { StandAddon } from "@/lib/landing/hardware";
import type { PublicPlan } from "@/lib/plans/public";
import type { PricingFaq } from "@/lib/plans/pricing-copy";
import { formatRupees } from "@/lib/landing/money";
import { landingStats } from "@/lib/landing/stats";
import { Eyebrow, PageIntro, PhoneScreenshot, SectionHeading, TextLink } from "./primitives";
import { Reveal, HeroWordReveal } from "./reveal";
import { FAQList, PricingCards } from "./pricing";
import { PlanComparison } from "./plan-comparison";
import { LocalizedCopy } from "./i18n";
import type { SeoLocale } from "@/lib/seo";

const featureRows: Array<{
  number: string;
  id: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  crop?: "orders" | "analytics";
  points: string[];
}> = [
  {
    number: "01",
    id: "reviews",
    title: "A QR code for Google reviews, with smart feedback routing",
    body: "Every rating sees the public review link and a private feedback form on the same screen. A low rating with a note can alert you by WhatsApp and email.",
    image: "/landing/app/reviews.webp",
    alt: "QR24x7 Android app screen for review requests",
    points: [
      "Every rating sees a public review link and a private feedback form.",
      "A low rating with a note can alert you on WhatsApp and email.",
      "Ask for reviews shares your public review link on WhatsApp."
    ]
  },
  {
    number: "02",
    id: "menu",
    title: "A digital menu you can update in minutes",
    body: "Keep your catalogue on the customer page and upload products in bulk with a CSV or Excel template.",
    image: "/landing/app/bulk-upload.webp",
    alt: "QR24x7 menu bulk upload screen with CSV and Excel template",
    points: [
      "Download CSV or Excel templates and demo files.",
      "Add item photos, prices and product variants.",
      "Saved menu items appear on your customer page."
    ]
  },
  {
    number: "03",
    id: "store",
    title: "WhatsApp orders and enquiries go to you",
    body: "Customers can send a cart or enquiry to your WhatsApp number. Orders stay on your channel, with no QR24x7 commission.",
    image: "/landing/app/orders.webp",
    alt: "QR24x7 Android app orders screen with order filters",
    crop: "orders",
    points: [
      "A customer cart opens a ready-to-send WhatsApp order to your number.",
      "WhatsApp orders have no QR24x7 commission.",
      "View incoming orders from the app."
    ]
  },
  {
    number: "04",
    id: "profile",
    title: "Your own business page, with 20 theme options",
    body: "Share your profile, menu, products and contact links on one page. Change the theme and page details from the app.",
    image: "/landing/app/themes.webp",
    alt: "QR24x7 business page theme options in the Android app",
    points: [
      "Choose from 20 page theme presets.",
      "Add a logo, business details and page buttons.",
      "Update your page details from the app."
    ]
  },
  {
    number: "05",
    id: "analytics",
    title: "Scan and review analytics, with weekly WhatsApp reports",
    body: "See activity in the app and get a weekly report on WhatsApp, so you can follow how your QR page is being used.",
    image: "/landing/app/analytics.webp",
    alt: "QR24x7 Android app analytics period filters",
    crop: "analytics",
    points: [
      "Review scans, ratings and order activity in the app.",
      "Get a weekly summary on WhatsApp.",
      "Monthly activity is available as a PDF report."
    ]
  },
  {
    number: "06",
    id: "products",
    title: "QR and NFC stands, with order tracking",
    body: "Choose a physical stand from the QR24x7 shop. Your QR and NFC open the same page, and stand orders include tracking.",
    image: "/landing/app/shop.webp",
    alt: "QR24x7 Android app shop with QR and NFC products",
    points: [
      "Choose from QR stands, NFC + QR combos, NFC cards and stickers.",
      "Approve the print proof before production.",
      "Track stand delivery from your account."
    ]
  }
];

const homeFaqs = [
  {
    q: "What is NFC? Do my customers need an app?",
    a: "NFC is the same tap used for contactless payments. Most phones open your page when they touch the stand. Phones without NFC scan the QR with the camera. No app either way.",
    qHi: "NFC क्या है? क्या ग्राहकों को ऐप चाहिए?",
    aHi: "NFC कॉन्टैक्टलेस पेमेंट जैसी टैप तकनीक है। ज़्यादातर फ़ोन स्टैंड छूते ही आपका पेज खोल देते हैं। बिना NFC वाले फ़ोन कैमरे से QR स्कैन कर सकते हैं। दोनों तरीकों में ऐप की ज़रूरत नहीं।"
  },
  {
    q: "Can I change my links after the stand is printed?",
    a: "Yes. The QR and NFC point at your QR24x7 page, so you can change the menu, links, offers, or theme from the dashboard. The printed stand stays the same.",
    qHi: "क्या स्टैंड छपने के बाद लिंक बदल सकते हैं?",
    aHi: "हाँ। QR और NFC आपके QR24x7 पेज पर खुलते हैं, इसलिए डैशबोर्ड से मेनू, लिंक, ऑफ़र या थीम बदल सकते हैं। छपे हुए स्टैंड को बदलने की ज़रूरत नहीं।"
  },
  {
    q: "How does WhatsApp ordering work?",
    a: "Customers add items and tap Order on WhatsApp. A message with the items, total, table or address, and a UPI link opens in WhatsApp to your number. You get the order with no commission.",
    qHi: "WhatsApp ऑर्डर कैसे काम करता है?",
    aHi: "ग्राहक आइटम जोड़कर Order on WhatsApp दबाते हैं। आइटम, कुल कीमत, टेबल या पता और UPI लिंक वाला संदेश आपके नंबर पर WhatsApp में खुलता है। ऑर्डर पर कोई कमीशन नहीं।"
  },
  {
    q: "Is this allowed by Google?",
    a: "Every customer sees the public Google link and a private note on the same screen, at any star rating. Nothing is posted for them. Rewards are never offered in exchange for a public review.",
    qHi: "क्या Google इसकी अनुमति देता है?",
    aHi: "हर ग्राहक को हर स्टार रेटिंग पर एक ही स्क्रीन में सार्वजनिक Google लिंक और निजी नोट का विकल्प दिखता है। ग्राहक की ओर से कुछ पोस्ट नहीं होता। सार्वजनिक रिव्यू के बदले कोई इनाम नहीं दिया जाता।"
  },
  {
    q: "Do you deliver the stands?",
    a: "Yes, across India with tracking. You approve the design first. We then print, program the NFC, and ship.",
    qHi: "क्या आप स्टैंड पूरे भारत में भेजते हैं?",
    aHi: "हाँ, ट्रैकिंग के साथ पूरे भारत में भेजते हैं। पहले आप डिज़ाइन को मंज़ूरी देते हैं। फिर हम प्रिंट करके NFC प्रोग्राम करते हैं और भेजते हैं।"
  },
  {
    q: "Can I manage more than one branch?",
    a: "Yes. Each branch, table, or staff member can have its own QR and NFC, and you see them in one dashboard.",
    qHi: "क्या मैं कई शाखाएँ संभाल सकता हूँ?",
    aHi: "हाँ। हर शाखा, टेबल या स्टाफ़ सदस्य के लिए अलग QR और NFC रख सकते हैं और सब कुछ एक डैशबोर्ड में देख सकते हैं।"
  }
];

const steps = [
  { number: "01", title: "Order a stand", body: "Pick a QR or QR + NFC stand from the shop, or download your QR and print it yourself." },
  { number: "02", title: "Set up in 10 minutes", body: "Add your review link, menu, WhatsApp number, and business details from the Android app." },
  { number: "03", title: "Customers scan or tap", body: "Their phone opens your business page in the browser. Customers do not need to install an app." },
  { number: "04", title: "Track and grow", body: "Follow reviews, scans, enquiries, and orders from the app, then keep improving your page." }
];

function FeatureRows({ locale = "en" }: { locale?: SeoLocale }) {
  return (
    <LocalizedCopy locale={locale}>
    <div className="qr-feature-list">
      {featureRows.map((feature, index) => (
        <Reveal key={feature.number}>
          <article id={feature.id} className={`qr-feature-row${index % 2 ? " is-reversed" : ""}`}>
            <div className="qr-feature-copy">
              <Eyebrow>PL. {feature.number} · PRODUCT</Eyebrow>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <ul className="qr-checked-list">
                {feature.points.map((point) => <li key={point}><Check size={16} aria-hidden="true" /> {point}</li>)}
              </ul>
            </div>
            <div className="qr-feature-visual">
              <PhoneScreenshot src={feature.image} alt={feature.alt} crop={feature.crop} sizes="(max-width: 760px) 320px, 390px" />
              <span className="qr-visual-index">{feature.number}</span>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
    </LocalizedCopy>
  );
}

function StatsBand({ trust, locale = "en" }: { trust: LandingTrust; locale?: SeoLocale }) {
  const stats = landingStats(trust);

  return (
    <LocalizedCopy locale={locale}><section className="qr-stats-band" aria-label="QR24x7 product facts">
      <div className="qr-wrap">
        <Eyebrow>THE SMALL DETAILS ADD UP</Eyebrow>
        <div className="qr-stats-grid">
          {stats.slice(0, 4).map((stat, index) => (
            <div className="qr-stat" key={`${stat.label}-${index}`}>
              {index ? <span className="qr-stat-spark" aria-hidden="true">✦</span> : null}
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

function Marquee({ locale = "en" }: { locale?: SeoLocale }) {
  const items = ["Google reviews", "Digital menu", "WhatsApp orders", "NFC stands", "Scan analytics", "Hindi + English"];
  return (
    <LocalizedCopy locale={locale}><div className="qr-marquee" aria-label="Reviews, menus, WhatsApp orders, NFC stands, analytics, Hindi and English">
      <div className="qr-marquee-track">
        {[0, 1].map((copy) => (
          <span key={copy} aria-hidden={copy === 1}>
            {items.map((item) => <span key={item}>{item}<i aria-hidden="true">✦</i></span>)}
          </span>
        ))}
      </div>
    </div>
    </LocalizedCopy>
  );
}

function StorySection({ stories, locale = "en" }: { stories: OwnerStory[]; locale?: SeoLocale }) {
  if (!stories.length) return null;
  return (
    <LocalizedCopy locale={locale}><section className="qr-section qr-story-section">
      <div className="qr-wrap">
        <SectionHeading number="09" eyebrow="From business owners" title="Made for the people behind the counter." />
        <div className="qr-stories-grid">
          {stories.slice(0, 3).map((story) => {
            const photo = story.photo.startsWith("/") || story.photo.startsWith("http") ? story.photo : `/landing/photos/${story.photo}-640.webp`;
            return (
              <figure className="qr-story-card" key={`${story.name}-${story.business}`}>
                <Image src={photo} alt={`${story.business} in ${story.city}`} width={640} height={480} sizes="(max-width: 760px) 85vw, 360px" unoptimized />
                <blockquote>“{story.quote}”</blockquote>
                <figcaption>{story.name} · {story.business}, {story.city}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

function StandCards({ hardware, locale = "en" }: { hardware: StandAddon[]; locale?: SeoLocale }) {
  if (!hardware.length) return null;
  const photos = ["product-reviews-800.webp", "product-menu-800.webp", "product-combo-800.webp", "product-store-800.webp"];
  return (
    <LocalizedCopy locale={locale}><section id="stands" className="qr-section qr-stands-section">
      <div className="qr-wrap">
        <div className="qr-section-heading qr-heading-split">
          <div><Eyebrow>05 / QR + NFC HARDWARE</Eyebrow><h2>A stand that works as hard as your team.</h2></div>
          <p>Choose from the QR24x7 shop. Your QR and NFC open the same page, and stand orders can be tracked.</p>
        </div>
        <div className="qr-stands-grid">
          {hardware.slice(0, 4).map((item, index) => {
            const src = item.imageUrl || `/landing/${photos[index % photos.length]}`;
            return (
              <article className="qr-stand-card" key={item.slug}>
                <Link href="/dashboard/shop" className="qr-stand-image" aria-label={`Order ${locale === "hi" ? item.nameHi : item.name}`}>
                  <Image src={src} alt={`${locale === "hi" ? item.nameHi : item.name} QR and NFC stand`} width={800} height={600} sizes="(max-width: 760px) 80vw, 290px" unoptimized />
                </Link>
                <div className="qr-stand-info">
                  <div><h3>{locale === "hi" ? item.nameHi : item.name}</h3><p>{item.needsNfc ? "QR + NFC" : locale === "hi" ? "QR स्टैंड" : "QR stand"}</p></div>
                  <strong>{formatRupees(item.salePaise)}</strong>
                </div>
                {item.mrpPaise && item.mrpPaise > item.salePaise ? <s className="qr-stand-mrp">{formatRupees(item.mrpPaise)}</s> : null}
                <Link href="/dashboard/shop" className="qr-button qr-button-light">View in shop <span aria-hidden="true">↗</span></Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

function FinalCTA({ brand, startHref, whatsapp, locale = "en" }: { brand: Brand; startHref: string; whatsapp: string | null; locale?: SeoLocale }) {
  const contactHref = whatsapp || `mailto:${brand.supportEmail || "hello@qr24x7.in"}`;
  return (
    <LocalizedCopy locale={locale}><section className="qr-section qr-final-cta">
      <div className="qr-wrap qr-final-inner">
        <div><Eyebrow>ONE SMALL TAP CAN CHANGE THE NEXT STEP</Eyebrow><h2>Ready to make every scan count?</h2><p>Start with a QR page. Add the stand and features that fit your business.</p></div>
        <div className="qr-final-actions">
          <Link className="qr-button qr-button-light" href={startHref}>Start free <ArrowUpRight size={16} /></Link>
          <a className="qr-button qr-button-outline-light" href={contactHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined}>Talk to us <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

export function HomeMarketing({
  brand,
  trust,
  startHref,
  whatsapp,
  plans,
  hardware,
  stories,
  faqs = HOME_FAQS,
  locale = "en"
}: {
  brand: Brand;
  trust: LandingTrust;
  startHref: string;
  whatsapp: string | null;
  plans: PublicPlan[];
  hardware: StandAddon[];
  stories: OwnerStory[];
  faqs?: PricingFaq[];
  locale?: SeoLocale;
}) {
  const contactHref = whatsapp || `mailto:${brand.supportEmail || "hello@qr24x7.in"}`;
  return (
    <LocalizedCopy locale={locale}><>
      <section className="qr-hero">
        <div className="qr-hero-glow" aria-hidden="true" />
        <svg className="qr-hero-lines" viewBox="0 0 1440 640" aria-hidden="true" preserveAspectRatio="none">
          <path d="M-80 380C110 180 215 205 308 345S310 580 90 585M1510 85c-225 75-304 180-225 315s142 180 300 200M-60 75c160 0 255 72 305 187" />
        </svg>
        <div className="qr-wrap qr-hero-grid">
          <div className="qr-hero-copy">
            <Eyebrow>REVIEWS · MENU · ORDERS</Eyebrow>
            <HeroWordReveal text={brand.name || "QR24x7"} />
            <p className="qr-hero-tagline">{brand.tagline || "Scan. Tap. Grow."}</p>
            <p className="qr-hero-lead">One QR stand. More Google reviews, a live menu and WhatsApp orders.</p>
            <p className="qr-hero-description">Give your customers one simple place to review, browse, message, or order — from the QR or a tap.</p>
            <div className="qr-hero-actions">
              <Link className="qr-button qr-button-dark" href={startHref}>Start free <ArrowUpRight size={16} /></Link>
              <a className="qr-button qr-button-light" href="#home-flow">See how it works <ArrowUpRight size={16} /></a>
            </div>
            <a className="qr-scroll-cue" href="#discover"><span aria-hidden="true" />Scroll to discover</a>
          </div>
          <Reveal className="qr-hero-visual">
            <div className="qr-hero-phone-wrap"><PhoneScreenshot src="/landing/app/home.webp" alt="QR24x7 Android app home showing today’s stats and setup checklist" sizes="(max-width: 760px) 224px, 284px" priority /></div>
            <figure className="qr-hero-product">
              <Image src="/landing/photos/stand-hero-640.webp" alt="QR24x7 QR and NFC stand on a business counter" width={640} height={480} priority sizes="(max-width: 760px) 46vw, 340px" />
              <figcaption>One stand. Many ways to grow.</figcaption>
            </figure>
            <span className="qr-hero-spark" aria-hidden="true">✳</span>
          </Reveal>
        </div>
      </section>

      <div id="discover"><Marquee locale={locale} /></div>

      <section className="qr-section qr-intro-section">
        <div className="qr-wrap qr-intro-grid">
          <Reveal><Eyebrow>01 / ONE PAGE, MORE POSSIBILITIES</Eyebrow></Reveal>
          <Reveal delay={0.08}><h2>One QR code for Google reviews, a digital menu, and WhatsApp orders.</h2></Reveal>
          <Reveal delay={0.16}><p>QR24x7 gives customers a useful next step and gives you a clear view of what happens after they scan.</p></Reveal>
        </div>
      </section>

      <section className="qr-section qr-features-section">
        <div className="qr-wrap">
          <SectionHeading number="02" eyebrow="What you get" title="Tools for the counter, the customer, and the follow-up." description="Use the pieces your business needs, from one QR page managed in the QR24x7 Android app." />
          <FeatureRows locale={locale} />
          <div className="qr-growth-tools">
            <article><Sparkles size={19} aria-hidden="true" /><div><h3>Refer and earn</h3><p>Invite another business and earn free plan months when eligible referrals complete a paid purchase.</p></div><TextLink href="/dashboard/refer">See referral details</TextLink></article>
            <article><Sparkles size={19} aria-hidden="true" /><div><h3>Become a reseller</h3><p>Apply to introduce QR24x7 to local businesses. Approval and active commission rules apply.</p></div><TextLink href="/dashboard/agent-apply">Reseller program</TextLink></article>
          </div>
        </div>
      </section>

      <StatsBand trust={trust} locale={locale} />
      <StorySection stories={locale === "hi" ? [] : stories} locale={locale} />

      <section id="home-flow" className="qr-section qr-process-section">
        <div className="qr-wrap">
          <div className="qr-section-heading qr-heading-split">
            <div><Eyebrow>03 / THE SIMPLE ROUTE</Eyebrow><h2>Four steps from a stand to a better customer loop.</h2></div>
            <p>LEAVES YOU WITH</p>
          </div>
          <ol className="qr-process-grid">
            {steps.map((step) => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
          <div className="qr-process-link"><TextLink href="/how-it-works">See how it works</TextLink></div>
        </div>
      </section>

      <StandCards hardware={hardware} locale={locale} />
      <PricingCards plans={plans} locale={locale} title="Pick your plan" description="Choose the active plan and duration that suit your business. Every price comes from the current plan catalog." />
      <FAQList faqs={faqs} locale={locale} />
      <FinalCTA brand={brand} startHref={startHref} whatsapp={whatsapp} locale={locale} />
    </></LocalizedCopy>
  );
}

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
          <ol className="qr-process-grid">{steps.map((step) => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
          <div className="qr-process-link"><TextLink href="/how-it-works#demo">Watch the demo</TextLink><span className="qr-link-gap" /><TextLink href="/#pricing">See pricing</TextLink></div>
        </div>
      </section>
    </></LocalizedCopy>
  );
}

export function HowItWorksMarketing({ brand, startHref, locale = "en" }: { brand: Brand; startHref: string; locale?: SeoLocale }) {
  return (
    <LocalizedCopy locale={locale}><>
      <PageIntro eyebrow="Scan · tap · grow" title="How one QR code brings Google reviews, a digital menu, and WhatsApp orders together." description="Get your page ready, put a QR or NFC stand on the counter, and give customers a quick way to review, browse, and message." />
      <section className="qr-section qr-how-section">
        <div className="qr-wrap">
          <div className="qr-section-heading qr-heading-split">
            <div><Eyebrow>01 / HOW IT WORKS</Eyebrow><h2>Four small steps. One connected page.</h2></div>
            <p>LEAVES YOU WITH</p>
          </div>
          <ol className="qr-how-timeline">
            {steps.map((step) => (
              <li key={step.number}>
                <div className="qr-how-number">{step.number}</div>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
                <span aria-hidden="true">✦</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="demo" className="qr-section qr-how-demo">
        <div className="qr-wrap qr-how-demo-grid">
          <div><Eyebrow>02 / TRY IT YOURSELF</Eyebrow><h2>See the customer page in action.</h2><p>Scan a live demo or open the interactive review page. The customer page works in a phone browser with no app install.</p><TextLink href="/how-it-works#demo">Watch the demo</TextLink><span className="qr-link-gap" /><TextLink href="/demo">Open the live demo</TextLink></div>
          <PhoneScreenshot src="/landing/app/home.webp" alt={`${brand.name} Android app dashboard with setup checklist`} sizes="(max-width: 760px) 228px, 280px" />
        </div>
      </section>
      <section className="qr-section qr-standalone-cta"><div className="qr-wrap"><h2>Ready for your own QR page?</h2><p>Start free, then choose a plan or stand when you need one.</p><div className="qr-demo-cta-actions"><Link className="qr-button qr-button-light" href={startHref}>Start free <ArrowUpRight size={16} /></Link><Link className="qr-button qr-button-outline-light" href="/#pricing">See pricing</Link></div></div></section>
    </></LocalizedCopy>
  );
}

export const HOME_FAQS = homeFaqs.map((item) => ({ qEn: item.q, qHi: item.qHi, aEn: item.a, aHi: item.aHi }));

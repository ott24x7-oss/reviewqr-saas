import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CakeSlice,
  Check,
  Coffee,
  Dumbbell,
  Hotel,
  Languages,
  MapPin,
  MessageCircle,
  Nfc,
  Scissors,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Star,
  Stethoscope,
  Upload,
  UtensilsCrossed,
  type LucideIcon
} from "lucide-react";
import type { Brand } from "@/lib/brand";
import type { LandingTrust } from "@/lib/landing/proof";
import type { OwnerStory } from "@/lib/landing/stories";
import type { StandAddon } from "@/lib/landing/hardware";
import type { PublicPlan } from "@/lib/plans/public";
import type { PricingFaq } from "@/lib/plans/pricing-copy";
import { formatRupees } from "@/lib/landing/money";
import { landingStats } from "@/lib/landing/stats";
import { Eyebrow, PageIntro, PhoneScreenshot, SectionHeading, TextLink } from "./primitives";
import { LocalizedCopy, marketingText } from "./i18n";
import { HomeFaq, HomePricing } from "./home-pricing";
import type { SeoLocale } from "@/lib/seo";
import { INDUSTRY_SLUGS, industryCategory, type IndustrySlug } from "@/lib/industry-pages";

const featureRows: Array<{
  number: string;
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    number: "01",
    title: "A QR code for Google reviews and private feedback",
    body: "Give every customer the public review link and a private feedback option, with alerts sent to you by WhatsApp and email.",
    icon: ShieldCheck
  },
  {
    number: "02",
    title: "A digital menu you can update in minutes",
    body: "Keep your catalogue on your customer page and upload products in bulk with a CSV or Excel template.",
    icon: Upload
  },
  {
    number: "03",
    title: "WhatsApp orders and enquiries go to you",
    body: "Customers can send a cart or enquiry to your WhatsApp number. Orders stay on your channel, with no QR24x7 commission.",
    icon: MessageCircle
  },
  {
    number: "04",
    title: "Your own business page, with 20 theme options",
    body: "Share your profile, menu, products and contact links on one page. Change the theme and page details from the app.",
    icon: Smartphone
  },
  {
    number: "05",
    title: "Scan and review analytics, with weekly WhatsApp reports",
    body: "See activity in the app and get a weekly report on WhatsApp, so you can follow how your QR page is being used.",
    icon: BarChart3
  },
  {
    number: "06",
    title: "QR and NFC stands, with order tracking",
    body: "Choose a physical stand from the QR24x7 shop. Your QR and NFC open the same page, and stand orders include tracking.",
    icon: Nfc
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
    a: "Every customer can open the public Google link, and anyone can also share a private note at any star rating. Nothing is posted for them. Rewards are never offered in exchange for a public review.",
    qHi: "क्या Google इसकी अनुमति देता है?",
    aHi: "हर ग्राहक सार्वजनिक Google लिंक खोल सकता है और कोई भी ग्राहक हर स्टार रेटिंग पर निजी संदेश भी भेज सकता है। ग्राहक की ओर से कुछ पोस्ट नहीं होता। सार्वजनिक रिव्यू के बदले कोई इनाम नहीं दिया जाता।"
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

export const HOME_STEPS = [
  { number: "01", title: "Order a stand", body: "Pick a QR or QR + NFC stand from the shop, or download your QR and print it yourself." },
  { number: "02", title: "Set up in 10 minutes", body: "Add your review link, menu, WhatsApp number, and business details from the Android app." },
  { number: "03", title: "Customers scan or tap", body: "Their phone opens your business page in the browser. Customers do not need to install an app." },
  { number: "04", title: "Track and grow", body: "Follow reviews, scans, enquiries, and orders from the app, then keep improving your page." }
];

export function FeatureRows({ locale = "en" }: { locale?: SeoLocale }) {
  return (
    <LocalizedCopy locale={locale}>
      <section id="features" className="qr-home-features">
        <div className="qr-home-container">
          <header className="qr-home-heading qr-home-heading-dark">
            <Eyebrow>Features</Eyebrow>
            <h2>Everything your counter needs. Nothing it doesn’t.</h2>
            <p>Use the tools that fit your business, from one QR page managed in the QR24x7 app.</p>
          </header>
          <div className="qr-home-feature-grid">
            {featureRows.map((feature) => {
              const Icon = feature.icon;
              return <article className="qr-home-feature-card" key={feature.number}>
                <span className="qr-home-feature-icon"><Icon size={21} aria-hidden="true" /></span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>;
            })}
          </div>
        </div>
      </section>
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
                <Image src={photo} alt={`${story.business} in ${story.city}`} width={640} height={480} sizes="(max-width: 760px) 85vw, 360px" loading="lazy" unoptimized />
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
  return (
    <LocalizedCopy locale={locale}><section id="shop" className="qr-home-shop">
      <div className="qr-home-container">
        <div className="qr-home-shop-heading">
          <div><Eyebrow>Shop stands</Eyebrow><h2>Counter-ready, delivered.</h2><p>Choose a real product from the shop. Your QR and NFC open the same page.</p></div>
          <Link href="/dashboard/shop" className="qr-home-inline-link">Browse all stands <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="qr-home-shop-grid">
          {hardware.length ? hardware.slice(0, 4).map((item, index) => {
            const productHref = `/dashboard/shop/${item.slug}`;
            return (
              <article className="qr-home-shop-card" key={item.slug}>
                <Link href={productHref} className="qr-home-product-visual" aria-label={`Order ${locale === "hi" ? item.nameHi : item.name}`}>
                  {item.imageUrl ? <Image src={item.imageUrl} alt={`${locale === "hi" ? item.nameHi : item.name} QR and NFC stand`} width={800} height={600} sizes="(max-width: 760px) 80vw, 290px" loading="lazy" unoptimized /> : <HomeStandVisual index={index} />}
                </Link>
                <div className="qr-home-product-info">
                  <div><h3>{locale === "hi" ? item.nameHi : item.name}</h3><p>{item.needsNfc ? "QR + NFC" : locale === "hi" ? "QR स्टैंड" : "QR stand"}</p></div>
                  <strong>{formatRupees(item.salePaise)}</strong>
                </div>
                {item.mrpPaise && item.mrpPaise > item.salePaise ? <s className="qr-home-product-mrp">{formatRupees(item.mrpPaise)}</s> : null}
                <Link href={productHref} className="qr-button qr-button-light">View in shop <span aria-hidden="true">↗</span></Link>
              </article>
            );
          }) : <p className="qr-home-shop-empty">{marketingText("Browse the shop to see available QR and NFC stands.", locale)}</p>}
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

function FinalCTA({ brand, startHref, whatsapp, locale = "en" }: { brand: Brand; startHref: string; whatsapp: string | null; locale?: SeoLocale }) {
  const contactHref = whatsapp || `mailto:${brand.supportEmail || "hello@qr24x7.in"}`;
  return (
    <LocalizedCopy locale={locale}><section id="start" className="qr-home-final">
      <div className="qr-home-container qr-home-final-inner">
        <div><Eyebrow>Scan. Tap. Grow.</Eyebrow><h2>Your next customer action starts at the counter.</h2><p>Start with a QR page. Add the stand and features that fit your business.</p></div>
        <div className="qr-home-final-actions">
          <Link className="qr-button qr-button-dark" href={startHref}>Start free <ArrowRight size={16} /></Link>
          <a className="qr-button qr-button-outline-light" href={contactHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener noreferrer" : undefined}><MessageCircle size={16} /> Talk to us</a>
        </div>
      </div>
    </section>
    </LocalizedCopy>
  );
}

export const HOME_REVIEW_POLICY_FAQ: PricingFaq = {
  qEn: "Do you ask every customer equally?",
  qHi: "क्या आप हर ग्राहक से समान रूप से पूछते हैं?",
  aEn: "Yes. Every customer gets the same option to open the public review link and share private feedback, whatever their star rating. We do not filter or hide unhappy customers from the public link, and we do not offer rewards for reviews.",
  aHi: "हाँ। हर ग्राहक को स्टार रेटिंग चाहे जो हो, सार्वजनिक रिव्यू लिंक खोलने और निजी फ़ीडबैक देने का समान विकल्प मिलता है। हम नाखुश ग्राहकों को सार्वजनिक लिंक से नहीं छाँटते या छिपाते, और रिव्यू के बदले इनाम नहीं देते।"
};

export function homeFaqsWithReviewPolicy(faqs: PricingFaq[]) {
  const policyQuestion = /^(is this allowed by google\?|do you ask every customer equally\?|do you use review gating\?)$/i;
  return [...faqs.filter((faq) => !policyQuestion.test(faq.qEn.trim())), HOME_REVIEW_POLICY_FAQ];
}

function QRGlyph({ className = "" }: { className?: string }) {
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < 21; y += 1) for (let x = 0; x < 21; x += 1) {
    const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    if (!inFinder && ((x * 7 + y * 13 + x * y) % 5 < 2)) cells.push([x, y]);
  }
  const Finder = ({ x, y }: { x: number; y: number }) => <g>
    <rect x={x} y={y} width="7" height="7" rx="1" />
    <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.5" fill="white" />
    <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.3" />
  </g>;
  return <svg viewBox="0 0 21 21" className={className} fill="currentColor" aria-hidden="true" shapeRendering="crispEdges">
    <Finder x={0} y={0} /><Finder x={14} y={0} /><Finder x={0} y={14} />
    {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
  </svg>;
}

function HomeStandVisual({ index }: { index: number }) {
  return <span className={`qr-home-stand-art qr-home-stand-art-${index % 3}`} aria-hidden="true">
    <span className="qr-home-stand-brand">QR24<span>x7</span><Nfc size={17} /></span>
    <span className="qr-home-stand-label">Scan to open your page</span>
    <span className="qr-home-stand-code"><QRGlyph /></span>
  </span>;
}

function HeroVisual({ locale }: { locale: SeoLocale }) {
  const actions = [
    { icon: Star, label: "Review on Google" },
    { icon: BookOpen, label: "View menu" },
    { icon: MessageCircle, label: "Order on WhatsApp" },
    { icon: ShieldCheck, label: "Private feedback" }
  ];
  return <div className="qr-home-visual" role="img" aria-label={locale === "hi" ? "QR और NFC स्टैंड और ग्राहक पेज का नमूना" : "Illustration of a QR and NFC stand beside a customer page preview"}>
    <div className="qr-home-visual-backdrop" />
    <div className="qr-home-hero-stand">
      <div className="qr-home-hero-stand-top"><span>QR24<span>x7</span></span><Nfc size={17} /></div>
      <p>{marketingText("Loved it? Review us on Google", locale)}</p>
      <div className="qr-home-hero-qr"><QRGlyph /></div>
      <span className="qr-home-tap-label"><Smartphone size={12} /> {marketingText("Scan or tap phone here", locale)}</span>
      <span className="qr-home-stand-foot" />
    </div>
    <div className="qr-home-phone">
      <div className="qr-home-phone-screen">
        <div className="qr-home-phone-cover">
          <span>{marketingText("Your business", locale)}</span>
          <strong>{marketingText("Your customer page", locale)}</strong>
          <small><MapPin size={10} /> {marketingText("Your city", locale)}</small>
        </div>
        <div className="qr-home-phone-actions">
          {actions.map(({ icon: Icon, label }, index) => <span className="qr-home-phone-action" key={label}>
            <i className={index === 0 ? "is-primary" : ""}><Icon size={12} /></i><b>{marketingText(label, locale)}</b>
          </span>)}
        </div>
      </div>
    </div>
    <div className="qr-home-example-badge"><span aria-hidden="true">✦</span>{marketingText("Example preview", locale)}</div>
  </div>;
}

function HeroHeadline({ locale }: { locale: SeoLocale }) {
  return <h1 className="qr-home-h1">
    {locale === "hi"
      ? marketingText("Get more Google reviews with one QR + NFC stand", locale)
      : <>Get more <span>Google reviews</span> with one QR + NFC stand</>}
  </h1>;
}

function HomeHero({ startHref, locale }: { startHref: string; locale: SeoLocale }) {
  return <section className="qr-home-hero" id="top">
    <div className="qr-home-container qr-home-hero-grid">
      <div className="qr-home-hero-copy">
        <span className="qr-home-kicker"><i aria-hidden="true" />{marketingText("Scan. Tap. Grow.", locale)}</span>
        <HeroHeadline locale={locale} />
        <p className="qr-home-hero-description">{marketingText("Give your customers one simple place to review, browse, message, or order — from the QR or a tap.", locale)}</p>
        <div className="qr-home-hero-actions">
          <Link className="qr-home-primary-button" href={startHref}>{marketingText("Start free", locale)}<ArrowRight size={16} /></Link>
          <a className="qr-home-secondary-button" href="#how">{marketingText("See how it works", locale)}</a>
        </div>
        <ul className="qr-home-points">
          {["Free plan", "Setup in 10 min", "Hindi + English"].map((item) => <li key={item}><Check size={16} aria-hidden="true" />{marketingText(item, locale)}</li>)}
        </ul>
      </div>
      <HeroVisual locale={locale} />
    </div>
  </section>;
}

const HOME_INDUSTRY_ICONS: Record<IndustrySlug, LucideIcon> = {
  restaurants: UtensilsCrossed,
  cafes: Coffee,
  bakeries: CakeSlice,
  salons: Scissors,
  clinics: Stethoscope,
  "kirana-stores": ShoppingBasket,
  hotels: Hotel,
  gyms: Dumbbell
};

function HomeIndustryTiles({ locale }: { locale: SeoLocale }) {
  return <LocalizedCopy locale={locale}><section className="qr-home-industries">
    <div className="qr-home-container">
      <header className="qr-home-heading">
        <Eyebrow>For your business</Eyebrow>
        <h2>Made for India’s local businesses.</h2>
        <p>Start with a page that fits the way your customers find and contact you.</p>
      </header>
      <div className="qr-home-industry-grid">
        {INDUSTRY_SLUGS.map((slug) => {
          const category = industryCategory(slug);
          if (!category) return null;
          const Icon = HOME_INDUSTRY_ICONS[slug];
          return <Link className="qr-home-industry-card" href={`${locale === "hi" ? "/hi" : ""}/for/${slug}`} key={slug}>
            <span className="qr-home-industry-icon"><Icon size={22} aria-hidden="true" /></span>
            <strong>{locale === "hi" ? category.hi : category.en}</strong>
            <span className="qr-home-industry-link">{marketingText("Explore", locale)}<ArrowRight size={15} aria-hidden="true" /></span>
          </Link>;
        })}
      </div>
    </div>
  </section></LocalizedCopy>;
}

function BenefitsStrip({ locale }: { locale: SeoLocale }) {
  const items = [
    { icon: Star, label: "Google reviews" },
    { icon: BookOpen, label: "Digital menu" },
    { icon: MessageCircle, label: "WhatsApp orders" },
    { icon: Nfc, label: "NFC stands" },
    { icon: BarChart3, label: "Scan analytics" },
    { icon: Languages, label: "Hindi + English" }
  ];
  return <section className="qr-home-benefits" aria-label={locale === "hi" ? "QR24x7 सुविधाएँ" : "QR24x7 benefits"}>
    <div className="qr-home-container qr-home-benefit-grid">
      {items.map(({ icon: Icon, label }) => <div className="qr-home-benefit" key={label}>
        <span><Icon size={17} aria-hidden="true" /></span><strong>{marketingText(label, locale)}</strong>
      </div>)}
    </div>
  </section>;
}

function HomeHowItWorks({ locale }: { locale: SeoLocale }) {
  const steps: ReadonlyArray<readonly [string, string]> = [
    ["Create your page in the app", "Add your business, menu and WhatsApp number in the Android app — in Hindi or English."],
    ["Put a stand on the counter", "Order a ready QR + NFC stand, or download your QR and print it yourself."],
    ["Customers scan or tap", "They open your page to review, browse your menu, order or share feedback."]
  ];
  return <LocalizedCopy locale={locale}><section id="how" className="qr-home-how">
    <div className="qr-home-container">
      <header className="qr-home-heading qr-home-heading-centered">
        <Eyebrow>How it works</Eyebrow>
        <h2>Live in 10 minutes. No tech skills needed.</h2>
      </header>
      <ol className="qr-home-step-grid">
        {steps.map(([title, body], index) => <li key={title}>
          <span className="qr-home-step-number">0{index + 1}</span><h3>{title}</h3><p>{body}</p>
        </li>)}
      </ol>
    </div>
  </section></LocalizedCopy>;
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
  const homeFaqs = homeFaqsWithReviewPolicy(faqs);
  return (
    <LocalizedCopy locale={locale}><div className="qr-home-content">
      <HomeHero startHref={startHref} locale={locale} />
      <BenefitsStrip locale={locale} />
      <HomeHowItWorks locale={locale} />
      <FeatureRows locale={locale} />
      <HomeIndustryTiles locale={locale} />
      <StandCards hardware={hardware} locale={locale} />
      <HomePricing plans={plans} locale={locale} />
      <StorySection stories={stories} locale={locale} />
      <StatsBand trust={trust} locale={locale} />
      <HomeFaq faqs={homeFaqs} locale={locale} />
      <FinalCTA brand={brand} startHref={startHref} whatsapp={whatsapp} locale={locale} />
    </div></LocalizedCopy>
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
            {HOME_STEPS.map((step) => (
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

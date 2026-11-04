import Link from "next/link";
import { Reveal } from "@/components/marketing/qr-site/reveal";
import { Eyebrow, PageIntro, SectionHeading } from "@/components/marketing/qr-site/primitives";
import { jsonLdString } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, indexableBusinessCount, type DirectoryBusiness, type LocalCategory, type LocalCity, type SeoLocale } from "@/lib/local-seo";
import { BusinessCard } from "./business-card";

export function CategoryHubContent({ category, rows, locale }: { category: LocalCategory; rows: Array<{ city: LocalCity; count: number }>; locale: SeoLocale }) {
  const hi = locale === "hi";
  const prefix = hi ? "/hi/in" : "/in";
  const path = `${prefix}/${category.slug}`;
  const breadcrumbs = buildBreadcrumbJsonLd([{ name: hi ? "होम" : "Home", path: hi ? "/hi" : "/" }, { name: hi ? "स्थानीय कारोबार" : "Local businesses", path }, { name: category[locale], path }]);
  return <div className="local-page local-hub-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbs) }} />
    <nav className="local-breadcrumb qr-wrap" aria-label={hi ? "ब्रेडक्रंब" : "Breadcrumb"}><Link href={hi ? "/hi" : "/"}>{hi ? "होम" : "Home"}</Link><span aria-hidden="true">/</span><span>{hi ? "स्थानीय कारोबार" : "Local businesses"}</span><span aria-hidden="true">/</span><span aria-current="page">{category[locale]}</span></nav>
    <PageIntro eyebrow={hi ? "श्रेणियाँ · 01" : "BROWSE BY CATEGORY · 01"} title={hi ? `${category.hi} के शहर` : `${category.en} by City`} description={hi ? `शहर चुनकर QR24x7 पेज और ग्राहक समीक्षाओं वाले ${category.hi} देखें।` : `Choose a city to browse ${category.en.toLowerCase()} with QR24x7 pages and customer review details.`} />
    <section className="qr-section local-hub-list-section"><div className="qr-wrap">
      <Reveal><SectionHeading number="01" eyebrow={hi ? "शहर चुनें" : "CHOOSE A CITY"} title={hi ? `${category.hi} कहाँ देखें` : `Explore ${category.en.toLowerCase()} near you`} description={hi ? `${rows.length} शहरों में सूचीबद्ध कारोबार उपलब्ध हैं।` : `Browse listed businesses in ${rows.length} ${rows.length === 1 ? "city" : "cities"}.`} /></Reveal>
      <div className="local-link-grid">{rows.map(({ city, count }, index) => <Reveal key={city.slug} delay={Math.min(index % 4, 3) * 0.04}><Link href={`${prefix}/${category.slug}/${city.slug}`} className="local-hub-card"><span className="local-hub-card-number">{String(index + 1).padStart(2, "0")}</span><span className="local-hub-card-copy"><strong>{category[locale]} · {city[locale]}</strong><small>{count} {hi ? "कारोबार" : count === 1 ? "business" : "businesses"}</small></span><span className="local-hub-card-arrow" aria-hidden="true">↗</span></Link></Reveal>)}</div>
    </div></section>
  </div>;
}

export function CityHubContent({ city, rows, locale }: { city: LocalCity; rows: Array<{ category: LocalCategory; count: number }>; locale: SeoLocale }) {
  const hi = locale === "hi";
  const prefix = hi ? "/hi/in" : "/in";
  const path = `${prefix}/city/${city.slug}`;
  const breadcrumbs = buildBreadcrumbJsonLd([{ name: hi ? "होम" : "Home", path: hi ? "/hi" : "/" }, { name: hi ? "शहर" : "Cities", path }, { name: city[locale], path }]);
  return <div className="local-page local-hub-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbs) }} />
    <nav className="local-breadcrumb qr-wrap" aria-label={hi ? "ब्रेडक्रंब" : "Breadcrumb"}><Link href={hi ? "/hi" : "/"}>{hi ? "होम" : "Home"}</Link><span aria-hidden="true">/</span><span>{hi ? "शहर" : "Cities"}</span><span aria-hidden="true">/</span><span aria-current="page">{city[locale]}</span></nav>
    <PageIntro eyebrow={hi ? "स्थानीय कारोबार · 01" : "LOCAL BUSINESSES · 01"} title={hi ? `${city.hi} के स्थानीय कारोबार` : `Local Businesses in ${city.en}`} description={hi ? `${city.hi} में श्रेणी के अनुसार व्यवसाय देखें।` : `Browse local businesses in ${city.en} by category and explore their QR24x7 pages.`} />
    <section className="qr-section local-hub-list-section"><div className="qr-wrap">
      <Reveal><SectionHeading number="01" eyebrow={hi ? "श्रेणी चुनें" : "BROWSE BY CATEGORY"} title={hi ? `${city.hi} में व्यवसाय` : `Businesses in ${city.en}`} description={hi ? `${rows.length} श्रेणियों में सूचीबद्ध कारोबार देखें।` : `Explore listed businesses across ${rows.length} ${rows.length === 1 ? "category" : "categories"}.`} /></Reveal>
      <div className="local-link-grid">{rows.map(({ category, count }, index) => <Reveal key={category.slug} delay={Math.min(index % 4, 3) * 0.04}><Link href={`${prefix}/${category.slug}/${city.slug}`} className="local-hub-card"><span className="local-hub-card-number">{String(index + 1).padStart(2, "0")}</span><span className="local-hub-card-copy"><strong>{category[locale]}</strong><small>{count} {hi ? "कारोबार" : count === 1 ? "business" : "businesses"}</small></span><span className="local-hub-card-arrow" aria-hidden="true">↗</span></Link></Reveal>)}</div>
    </div></section>
  </div>;
}

export function ServiceLandingContent({ city, businesses, allBusinesses, locale, minBusinessesPerPage = 1 }: { city: LocalCity; businesses: DirectoryBusiness[]; allBusinesses: DirectoryBusiness[]; locale: SeoLocale; minBusinessesPerPage?: number }) {
  const hi = locale === "hi";
  const prefix = hi ? "/hi" : "";
  const categories = new Map<string, { category: LocalCategory; count: number }>();
  const nearby = new Map<string, LocalCity>();
  for (const business of businesses) {
    const old = categories.get(business.category.slug);
    categories.set(business.category.slug, { category: business.category, count: (old?.count || 0) + 1 });
  }
  const cityState = businesses.find((business) => business.state)?.state?.toLocaleLowerCase();
  if (cityState) for (const business of allBusinesses) {
    if (business.state?.toLocaleLowerCase() === cityState) nearby.set(business.normalizedCity.slug, business.normalizedCity);
  }
  const popular = [...categories.values()].filter(({ count }) => indexableBusinessCount(count, minBusinessesPerPage)).sort((a, b) => b.count - a.count).slice(0, 4);
  const faq = hi ? [
    { question: `${city.hi} में Google समीक्षा QR कैसे काम करता है?`, answer: "ग्राहक QR स्कैन करके आपके समीक्षा पेज और Google समीक्षा लिंक तक पहुँचते हैं।" },
    { question: "क्या QR24x7 पर मेनू और WhatsApp ऑर्डर जोड़ सकते हैं?", answer: "हाँ। अपना डिजिटल मेनू जोड़ें और उपलब्ध होने पर ग्राहकों को WhatsApp पर ऑर्डर करने दें।" },
    { question: "क्या मैं मुफ़्त में शुरू कर सकता हूँ?", answer: "हाँ। मुफ़्त खाता बनाएँ, अपना व्यवसाय पेज सेट करें और QR को ग्राहकों के साथ साझा करें।" }
  ] : [
    { question: `How does a Google review QR code work in ${city.en}?`, answer: "Customers scan your QR code to open your business page and follow its Google review link." },
    { question: "Can QR24x7 include a menu and WhatsApp orders?", answer: "Yes. Add a digital menu and let customers place orders on WhatsApp when your store is enabled." },
    { question: "Can I start for free?", answer: "Yes. Create a free account, set up your business page and share its QR code with customers." }
  ];
  const path = `/qr-code-for-google-reviews/${city.slug}`;
  const crumbs = buildBreadcrumbJsonLd([{ name: hi ? "होम" : "Home", path: hi ? "/hi" : "/" }, { name: hi ? "शहर के लिए QR" : "QR for local businesses", path: `${prefix}${path}` }]);
  const faqs = buildFaqJsonLd(faq);
  const intro = hi
    ? `${city.hi} के कारोबार QR24x7 से ग्राहकों के लिए समीक्षा, मेनू और संपर्क विकल्प एक QR पेज पर साझा कर सकते हैं। ${businesses.length ? `शहर के ${businesses.length} सूचीबद्ध व्यवसाय पहले से इस पेज का उपयोग कर रहे हैं।` : "अपना व्यवसाय पेज आज ही तैयार करें।"}`
    : `Businesses in ${city.en} can use QR24x7 to share reviews, menus and contact options from one QR page. ${businesses.length ? `${businesses.length} listed local ${businesses.length === 1 ? "business is" : "businesses are"} already using a QR24x7 page.` : "Set up a business page for your team today."}`;
  const title = hi ? `${city.hi} के लिए Google समीक्षा QR` : `Google Review QR Code in ${city.en}`;
  const steps = [
    { title: hi ? "पेज तैयार करें" : "Set up your page", body: hi ? "व्यवसाय की जानकारी, Google समीक्षा लिंक और मेनू जोड़ें।" : "Add your business details, Google review link and menu." },
    { title: hi ? "QR साझा करें" : "Share your QR", body: hi ? "QR को काउंटर, बिल या टेबल पर रखें।" : "Place the QR on your counter, receipts or tables." },
    { title: hi ? "गतिविधि देखें" : "Follow activity", body: hi ? "एक ही जगह स्कैन, ग्राहक प्रतिक्रिया और ऑर्डर देखें।" : "Track scans, customer feedback and orders in one place." }
  ];
  return <div className="local-page local-service-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([crumbs, faqs]) }} />
    <nav className="local-breadcrumb qr-wrap" aria-label={hi ? "ब्रेडक्रंब" : "Breadcrumb"}><Link href={hi ? "/hi" : "/"}>{hi ? "होम" : "Home"}</Link><span aria-hidden="true">/</span><span aria-current="page">{hi ? "Google समीक्षा QR" : "Google review QR"}</span></nav>
    <PageIntro eyebrow={hi ? "Google समीक्षा QR · 01" : "GOOGLE REVIEW QR · 01"} title={title} description={intro} />

    <section className="qr-section local-service-steps"><div className="qr-wrap">
      <Reveal><SectionHeading number="01" eyebrow={hi ? "शुरू करने के तीन कदम" : "THREE SIMPLE STEPS"} title={hi ? "एक QR पेज से शुरुआत करें" : "Start with one QR page"} /></Reveal>
      <div className="local-step-grid">{steps.map((item, index) => <Reveal key={item.title} delay={index * 0.06}><article className="local-step-card"><span className="local-business-card-number">{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p></article></Reveal>)}</div>
      <div className="local-service-actions"><Link className="qr-button qr-button-green" href={hi ? "/hi/register" : "/register"}>{hi ? "मुफ़्त शुरू करें" : "Start free"}<span aria-hidden="true">↗</span></Link><Link className="qr-button qr-button-light" href={`${prefix}/pricing`}>{hi ? "प्लान और कीमतें" : "Plans and pricing"}</Link></div>
    </div></section>

    {businesses.length ? <section className="qr-section local-listings-section"><div className="qr-wrap">
      <Reveal><SectionHeading number="02" eyebrow={hi ? "पहले से सूचीबद्ध" : "LOCAL BUSINESSES"} title={hi ? `${city.hi} के कारोबार` : `Businesses in ${city.en}`} description={hi ? "स्थानीय QR24x7 पेज, रेटिंग और मेनू देखें।" : "Explore local QR24x7 pages, ratings and menus."} /></Reveal>
      <div className="local-business-grid">{businesses.map((business, index) => <Reveal key={business.id} delay={Math.min(index % 4, 3) * 0.04}><BusinessCard business={business} locale={locale} /></Reveal>)}</div>
    </div></section> : null}

    {popular.length ? <section className="qr-section local-related-section"><div className="qr-wrap">
      <Reveal><SectionHeading number={businesses.length ? "03" : "02"} eyebrow={hi ? "श्रेणियाँ" : "EXPLORE THE DIRECTORY"} title={hi ? `${city.hi} में लोकप्रिय श्रेणियाँ` : `Popular categories in ${city.en}`} /></Reveal>
      <div className="local-link-grid">{popular.map(({ category, count }, index) => <Reveal key={category.slug} delay={Math.min(index % 4, 3) * 0.04}><Link className="local-hub-card" href={`${prefix}/in/${category.slug}/${city.slug}`}><span className="local-hub-card-number">{String(index + 1).padStart(2, "0")}</span><span className="local-hub-card-copy"><strong>{category[locale]}</strong><small>{count} {hi ? "कारोबार" : count === 1 ? "business" : "businesses"}</small></span><span className="local-hub-card-arrow" aria-hidden="true">↗</span></Link></Reveal>)}</div>
    </div></section> : null}

    {nearby.size > 1 ? <section className="qr-section local-related-section"><div className="qr-wrap">
      <Reveal><SectionHeading number={businesses.length ? "04" : "03"} eyebrow={hi ? "आसपास के शहर" : "NEARBY CITIES"} title={hi ? "पास के शहर" : "Explore nearby cities"} /></Reveal>
      <div className="local-chip-list">{[...nearby.values()].filter((item) => item.slug !== city.slug).slice(0, 8).map((item) => <Link key={item.slug} className="local-link-chip" href={`${prefix}/qr-code-for-google-reviews/${item.slug}`}>{item[locale]}<span aria-hidden="true">↗</span></Link>)}</div>
    </div></section> : null}

    <section className="qr-section local-faq-section"><div className="qr-wrap">
      <Reveal><SectionHeading number="05" eyebrow={hi ? "सहायता" : "GOOD TO KNOW"} title={hi ? "अक्सर पूछे जाने वाले सवाल" : "Questions about review QR codes"} /></Reveal>
      <div className="local-faq-list">{faq.map((item) => <details key={item.question} className="local-faq-item"><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>
    </div></section>
  </div>;
}

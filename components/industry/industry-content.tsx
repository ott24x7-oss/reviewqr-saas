import Image from "next/image";
import Link from "next/link";
import type { PublicPlan } from "@/lib/plans/public";
import { formatRupees } from "@/lib/landing/money";
import { industryCopy, type IndustrySlug } from "@/lib/industry-pages";
import { LOCAL_CATEGORIES, LOCAL_CITIES, type SeoLocale } from "@/lib/local-seo";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdString } from "@/lib/seo";

type Inventory = Awaited<ReturnType<typeof import("@/lib/local-seo").getDirectoryInventory>>;

export function IndustryContent({ slug, locale, plans, inventory, minBusinesses }: { slug: IndustrySlug; locale: SeoLocale; plans: PublicPlan[]; inventory: Inventory; minBusinesses: number }) {
  const copy = industryCopy(slug, locale);
  const hi = locale === "hi";
  const basePath = `/for/${slug}`;
  const categoryName = LOCAL_CATEGORIES.find((category) => category.slug === slug)?.[locale] || slug;
  const plan = plans.filter((item) => copy.modules.every((module) => item.modules.includes(module))).sort((a, b) => (a.modules.length - b.modules.length) || ((a.prices[0]?.pricePaise || 0) - (b.prices[0]?.pricePaise || 0)))[0];
  const topCities = ["mumbai", "delhi", "bengaluru", "hyderabad", "pune"]
    .map((citySlug) => LOCAL_CITIES.find((city) => city.slug === citySlug))
    .filter((city): city is (typeof LOCAL_CITIES)[number] => Boolean(city))
    .map((city) => ({ city, rows: inventory.pages.get(`${slug}/${city.slug}`) || [] }))
    .filter(({ rows }) => rows.length >= minBusinesses);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: hi ? "होम" : "Home", path: "/" },
    { name: hi ? "आपके व्यवसाय के लिए" : "For your business", path: "/" },
    { name: categoryName, path: basePath }
  ], locale);

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(buildFaqJsonLd(copy.faqs)) }} />
    <section className="qr-section qr-industry-hero"><div className="qr-wrap qr-industry-grid">
      <div>
        <p className="qr-eyebrow">{hi ? "आपके कारोबार के लिए" : "FOR YOUR BUSINESS"}</p>
        <h1>{copy.h1}</h1><p className="qr-industry-intro">{copy.intro}</p>
        <ul className="qr-industry-benefits">{copy.benefits.map((benefit) => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}</ul>
        <div className="qr-hero-actions"><Link className="qr-button qr-button-dark" href="/register">{hi ? "शुरू करें" : "Get started"} ↗</Link><Link className="qr-button qr-button-light" href="/pricing">{hi ? "प्लान देखें" : "See plans"}</Link></div>
      </div>
      <div className="qr-industry-visual"><Image src={copy.image} alt={hi ? `${slug} के कारोबार के लिए QR24x7 ऐप स्क्रीन` : `QR24x7 app screen for ${slug}`} width={540} height={1120} sizes="(max-width: 760px) 78vw, 390px" priority /><span>{hi ? "ऐप स्क्रीन" : "QR24x7 app"}</span></div>
    </div></section>

    <section className="qr-section qr-industry-section"><div className="qr-wrap">
      <header className="qr-section-heading"><p className="qr-eyebrow">{hi ? "आपके रोज़ के काम के लिए" : "MADE FOR THE WAY YOU WORK"}</p><h2>{hi ? `${categoryName} के लिए उपयोगी QR टूल` : `A QR page that fits your ${categoryName.toLowerCase()}`}</h2></header>
      <div className="qr-industry-benefit-grid">{copy.benefits.map((item, index) => <article key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</div>
    </div></section>

    <section className="qr-section qr-industry-section"><div className="qr-wrap">
      <header className="qr-section-heading"><p className="qr-eyebrow">{hi ? "चार आसान कदम" : "HOW IT WORKS"}</p><h2>{hi ? "पेज से ग्राहक तक" : "From your page to your customers"}</h2></header>
      <ol className="qr-how-timeline">{copy.steps.map((step, index) => <li key={step.title}><span className="qr-how-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
    </div></section>

    {plan ? <section className="qr-section qr-industry-plan"><div className="qr-wrap"><div><p className="qr-eyebrow">{hi ? "आपके काम के लिए सुझाया गया प्लान" : "PLAN FOR YOUR WORKFLOW"}</p><h2>{hi ? `${plan.nameHi} प्लान` : `${plan.nameEn} plan`}</h2><p>{hi ? "इस प्लान में आपके पेज के लिए ज़रूरी मॉड्यूल शामिल हैं।" : `Includes ${copy.modules.map((module) => module === "MENU" ? "digital menus" : module === "STORE" ? "WhatsApp ordering" : "Google reviews").join(" and ")}, which match this page's workflow.`}</p></div><div><strong>{plan.prices[0] ? `${formatRupees(plan.prices[0].pricePaise)}${hi ? " से" : " / starting"}` : hi ? "प्लान देखें" : "See plan"}</strong><Link className="qr-button qr-button-dark" href={`/plans/${plan.slug}`}>{hi ? "प्लान की जानकारी" : "View plan"} ↗</Link></div></div></section> : null}

    {topCities.length ? <section className="qr-section qr-industry-section"><div className="qr-wrap"><header className="qr-section-heading"><p className="qr-eyebrow">{hi ? "स्थानीय कारोबार" : "LOCAL BUSINESSES"}</p><h2>{hi ? "शहर में कारोबार देखें" : `Explore ${categoryName.toLowerCase()} in your city`}</h2></header><div className="qr-industry-city-links">{topCities.map(({ city, rows }) => <Link key={city.slug} href={`${hi ? "/hi" : ""}/in/${slug}/${city.slug}`}><span>{hi ? city.hi : city.en}</span><small>{rows.length} {hi ? "कारोबार" : rows.length === 1 ? "business" : "businesses"}</small></Link>)}</div></div></section> : null}

    <section className="qr-section qr-industry-faq"><div className="qr-wrap"><header className="qr-section-heading"><p className="qr-eyebrow">FAQ</p><h2>{hi ? "अक्सर पूछे जाने वाले सवाल" : "Common questions"}</h2></header><div className="qr-faq-list">{copy.faqs.map((faq) => <details className="qr-faq-item" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div></section>

    <section className="qr-section qr-standalone-cta"><div className="qr-wrap"><h2>{hi ? "अपने कारोबार का QR पेज बनाएँ" : `Set up a QR page for your ${categoryName.toLowerCase()}`}</h2><p>{hi ? "मेनू, संपर्क और रिव्यू लिंक एक जगह रखें।" : "Bring your menu, contact details and public review link together."}</p><Link className="qr-button qr-button-light" href="/register">{hi ? "मुफ़्त शुरू करें" : "Start free"} ↗</Link></div></section>
  </>;
}

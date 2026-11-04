import Link from "next/link";
import { Reveal } from "@/components/marketing/qr-site/reveal";
import { Eyebrow, PageIntro, SectionHeading } from "@/components/marketing/qr-site/primitives";
import { jsonLdString } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildDirectoryJsonLd, buildFaqJsonLd, categoryFromSlug, cityFromSlug, directorySeoTitle, localFaqs, localIntro, type DirectoryBusiness, type LocalCategory, type LocalCity, type SeoLocale } from "@/lib/local-seo";
import type { LocalPagesConfig } from "@/lib/settings";
import { BusinessCard } from "./business-card";

export function DirectoryContent({ category, city, businesses, inventory, config, locale }: {
  category: LocalCategory; city: LocalCity; businesses: DirectoryBusiness[];
  inventory: { pages: Map<string, DirectoryBusiness[]> };
  config: LocalPagesConfig; locale: SeoLocale;
}) {
  const hi = locale === "hi";
  const pathPrefix = hi ? "/hi/in" : "/in";
  const path = `${pathPrefix}/${category.slug}/${city.slug}`;
  const faqs = localFaqs(category, city, locale);
  const isIndexable = (rows: DirectoryBusiness[]) => rows.length >= config.minBusinessesPerPage;
  const sameCategory = [...inventory.pages.entries()].filter(([key, rows]) => key.startsWith(`${category.slug}/`) && key !== `${category.slug}/${city.slug}` && isIndexable(rows));
  const relatedCategories = [...inventory.pages.entries()].filter(([key, rows]) => key.endsWith(`/${city.slug}`) && !key.startsWith(`${category.slug}/`) && isIndexable(rows));
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: hi ? "होम" : "Home", path: hi ? "/hi" : "/" },
    { name: hi ? "स्थानीय कारोबार" : "Local businesses", path: `${pathPrefix}/city/${city.slug}` },
    { name: `${category[locale]} · ${city[locale]}`, path }
  ]);
  const itemList = buildDirectoryJsonLd({ businesses, category, city, locale });
  const faqSchema = buildFaqJsonLd(faqs);
  const title = directorySeoTitle(category, city, locale);

  return <div className="local-page local-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([itemList, breadcrumb, faqSchema]) }} />
    <nav aria-label={hi ? "ब्रेडक्रंब" : "Breadcrumb"} className="local-breadcrumb qr-wrap">
      <Link href={hi ? "/hi" : "/"}>{hi ? "होम" : "Home"}</Link><span aria-hidden="true">/</span><Link href={`${pathPrefix}/city/${city.slug}`}>{hi ? "स्थानीय कारोबार" : "Local businesses"}</Link><span aria-hidden="true">/</span><span aria-current="page">{category[locale]} · {city[locale]}</span>
    </nav>
    <PageIntro eyebrow={hi ? "स्थानीय व्यवसाय · 01" : "LOCAL BUSINESSES · 01"} title={title} description={localIntro(config, category, city, locale)} />

    <section className="qr-section local-listings-section" aria-label={hi ? "व्यवसाय सूची" : "Business listings"}>
      <div className="qr-wrap">
        <Reveal><SectionHeading number="01" eyebrow={hi ? "चुनिंदा कारोबार" : "THE DIRECTORY"} title={hi ? `${city.hi} में ${category.hi}` : `${category.en} in ${city.en}`} description={hi ? `${businesses.length} सूचीबद्ध कारोबार देखें और उनके पेज, रेटिंग व मेनू जानें।` : `Browse ${businesses.length} listed ${category.en.toLowerCase()} and compare their pages, ratings and menus.`} /></Reveal>
        <div className="local-business-grid">
          {businesses.map((business, index) => <Reveal key={business.id} delay={Math.min(index % 4, 3) * 0.04}><BusinessCard business={business} locale={locale} /></Reveal>)}
        </div>
      </div>
    </section>

    {sameCategory.length ? <section className="qr-section local-related-section">
      <div className="qr-wrap">
        <Reveal><SectionHeading number="02" eyebrow={hi ? "और शहर" : "EXPLORE MORE"} title={hi ? `अन्य शहरों में ${category.hi}` : `${category.en} in other cities`} /></Reveal>
        <div className="local-link-grid">{sameCategory.map(([key], index) => { const citySlug = key.split("/")[1]; const linkedCity = cityFromSlug(citySlug); return linkedCity ? <Reveal key={key} delay={Math.min(index % 4, 3) * 0.04}><Link className="local-hub-card" href={`${pathPrefix}/${category.slug}/${citySlug}`}><span className="local-hub-card-number">{String(index + 1).padStart(2, "0")}</span><span>{hi ? `${category.hi} · ${linkedCity.hi}` : `${category.en} in ${linkedCity.en}`}</span><span className="local-hub-card-arrow" aria-hidden="true">↗</span></Link></Reveal> : null; })}</div>
      </div>
    </section> : null}

    {relatedCategories.length ? <section className="qr-section local-related-section">
      <div className="qr-wrap">
        <Reveal><SectionHeading number={sameCategory.length ? "03" : "02"} eyebrow={hi ? "इसी शहर में" : "AROUND THE CITY"} title={hi ? `${city.hi} में अन्य श्रेणियाँ` : `More categories in ${city.en}`} /></Reveal>
        <div className="local-link-grid">{relatedCategories.map(([key], index) => { const categorySlug = key.split("/")[0]; const linkedCategory = categoryFromSlug(categorySlug); return linkedCategory ? <Reveal key={key} delay={Math.min(index % 4, 3) * 0.04}><Link className="local-hub-card" href={`${pathPrefix}/${categorySlug}/${city.slug}`}><span className="local-hub-card-number">{String(index + 1).padStart(2, "0")}</span><span>{linkedCategory[locale]}</span><span className="local-hub-card-arrow" aria-hidden="true">↗</span></Link></Reveal> : null; })}</div>
      </div>
    </section> : null}

    <section className="qr-section local-faq-section">
      <div className="qr-wrap">
        <Reveal><SectionHeading number="04" eyebrow={hi ? "सहायता" : "GOOD TO KNOW"} title={hi ? "अक्सर पूछे जाने वाले सवाल" : "Questions about the directory"} /></Reveal>
        <div className="local-faq-list">{faqs.map((faq) => <details key={faq.question} className="local-faq-item"><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div>
    </section>

    <section className="qr-section local-join-section">
      <div className="qr-wrap"><Reveal><div className="local-join-card"><div><Eyebrow>{hi ? "QR24X7 · मुफ़्त शुरुआत" : "QR24X7 · START FREE"}</Eyebrow><h2>{hi ? "इस सूची में अपना कारोबार जोड़ें" : "Put your business on the map"}</h2><p>{hi ? "अपना QR पेज, मेनू और ग्राहक समीक्षा एक ही जगह साझा करें।" : "Share your QR page, menu and customer reviews with local customers."}</p></div><Link className="qr-button qr-button-green" href={hi ? "/hi/register" : "/register"}>{hi ? "मुफ़्त शुरू करें" : "Start free"}<span aria-hidden="true">↗</span></Link></div></Reveal></div>
    </section>
  </div>;
}

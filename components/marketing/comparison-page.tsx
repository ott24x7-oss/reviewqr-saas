import Link from "next/link";
import { COMPARISON_PATH, comparisonCopy } from "@/lib/comparison";
import type { SeoLocale } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdString } from "@/lib/seo";

export function ComparisonPage({ locale }: { locale: SeoLocale }) {
  const copy = comparisonCopy(locale);
  const hi = locale === "hi";
  const crumb = buildBreadcrumbJsonLd([
    { name: hi ? "होम" : "Home", path: "/" },
    { name: hi ? "तुलना" : "Comparison", path: COMPARISON_PATH }
  ], locale);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(crumb) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(buildFaqJsonLd([...copy.faqs])) }} />
    <section className="qr-section qr-compare-page"><div className="qr-wrap">
      <p className="qr-eyebrow">{hi ? "खाना ऑर्डर करने के तरीके" : "ORDERING OPTIONS"}</p>
      <h1>{copy.title}</h1><p className="qr-compare-intro">{copy.intro}</p>
      <div className="qr-compare-scroll"><table className="qr-compare-honest"><thead><tr><th scope="col">{hi ? "विषय" : "What to compare"}</th><th scope="col">QR24x7</th><th scope="col">{hi ? "कमीशन वाला फ़ूड ऑर्डर ऐप" : "Commission based food ordering apps"}</th></tr></thead><tbody>{copy.rows.map(([label, qr, app]) => <tr key={label}><th scope="row">{label}</th><td>{qr}</td><td>{app}</td></tr>)}</tbody></table></div>
      <section className="qr-marketplace-note"><h2>{copy.marketplaceTitle}</h2><p>{copy.marketplaceBody}</p></section>
      <section className="qr-compare-faq"><h2>{hi ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}</h2>{copy.faqs.map((faq) => <details className="qr-faq-item" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
      <section className="qr-compare-cta"><p>{copy.cta}</p><Link className="qr-button qr-button-dark" href="/register">{hi ? "शुरू करें" : "Get started"} ↗</Link></section>
    </div></section>
  </>;
}

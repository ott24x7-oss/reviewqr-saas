import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brand";
import type { PhotoCredit } from "@/lib/landing/credits";
import { talkToUsHref } from "@/lib/landing/money";
import { getSeoConfig } from "@/lib/settings";
import { jsonLdString, publicLocalePath, type SeoLocale } from "@/lib/seo";
import { qrMarketingFonts } from "./fonts";
import { SiteHeader } from "./site-header";
import { LocalizedCopy } from "./i18n";
import { PublicAnalytics } from "./public-analytics";
export { Eyebrow, PageIntro, PhoneScreenshot, SectionHeading, TextLink } from "./primitives";

const footerGroups = [
  {
    title: "For your business",
    links: [
      ["Restaurants", "/for/restaurants"], ["Cafes", "/for/cafes"], ["Bakeries", "/for/bakeries"], ["Salons", "/for/salons"],
      ["Clinics", "/for/clinics"], ["Kirana stores", "/for/kirana-stores"], ["Hotels", "/for/hotels"], ["Gyms", "/for/gyms"]
    ]
  },
  {
    title: "Explore",
    links: [
      ["Features", "/features"],
      ["How it works", "/how-it-works"],
      ["Pricing", "/pricing"],
      ["Live demo", "/demo"],
      ["Shop / Stands", "/dashboard/shop"]
    ]
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Refer and earn", "/dashboard/refer"],
      ["Reseller program", "/dashboard/agent-apply"],
      ["Reseller terms", "/reseller-terms"]
    ]
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Refunds", "/refund"],
      ["Delete account", "/account/delete"]
    ]
  }
];

export async function SiteShell({
  brand,
  children,
  startHref = "/register",
  email = brand.supportEmail || "hello@qr24x7.in",
  whatsapp,
  credits = [],
  locale = "en",
  path = "/",
  breadcrumbName,
  includeBreadcrumb = true
}: {
  brand: Brand;
  children: ReactNode;
  startHref?: string;
  email?: string;
  whatsapp?: string | null;
  credits?: PhotoCredit[];
  locale?: SeoLocale;
  /** English-equivalent path, used to keep the language switcher on the matching page. */
  path?: string;
  breadcrumbName?: string;
  includeBreadcrumb?: boolean;
}) {
  const [supportWhatsApp, seo] = await Promise.all([whatsapp === undefined ? talkToUsHref() : whatsapp, getSeoConfig()]);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in").replace(/\/$/, "");
  const actualPath = publicLocalePath(path, locale);
  const labels: Record<string, { en: string; hi: string }> = {
    "/features": { en: "Features", hi: "सुविधाएँ" }, "/how-it-works": { en: "How it works", hi: "कैसे काम करता है" },
    "/pricing": { en: "Pricing", hi: "कीमतें" }, "/about": { en: "About", hi: "हमारे बारे में" },
    "/demo": { en: "Live demo", hi: "लाइव डेमो" }, "/privacy": { en: "Privacy", hi: "गोपनीयता" },
    "/terms": { en: "Terms", hi: "सेवा की शर्तें" }, "/refund": { en: "Refunds", hi: "रिफंड" },
    "/reseller-terms": { en: "Reseller terms", hi: "रीसेलर की शर्तें" }
  };
  const currentLabel = breadcrumbName || labels[path]?.[locale] || (path.startsWith("/plans/") ? path.split("/").pop() : "") || "QR24x7";
  const breadcrumb = path === "/" || !includeBreadcrumb ? null : {
    "@context": "https://schema.org", "@type": "BreadcrumbList", inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "hi" ? "होम" : "Home", item: `${baseUrl}${publicLocalePath("/", locale)}` },
      { "@type": "ListItem", position: 2, name: currentLabel, item: `${baseUrl}${actualPath}` }
    ]
  };
  return (
    <div className={`${qrMarketingFonts} qr-site`}>
      <LocalizedCopy locale={locale}>
        <a className="qr-skip-link" href="#main-content">Skip to content</a>
      </LocalizedCopy>
      <SiteHeader brand={brand} startHref={startHref} locale={locale} path={path} />
      {breadcrumb ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} /> : null}
      <PublicAnalytics ga4MeasurementId={seo.analytics.ga4MeasurementId} gtmId={seo.analytics.gtmId} respectDnt={seo.analytics.respectDnt} />
      <main id="main-content">{children}</main>
      <SiteFooter brand={brand} email={email} whatsapp={supportWhatsApp} credits={credits} locale={locale} path={path} />
    </div>
  );
}

export function SiteFooter({
  brand,
  email,
  whatsapp,
  credits,
  locale = "en",
  path = "/"
}: {
  brand: Brand;
  email: string;
  whatsapp?: string | null;
  credits: PhotoCredit[];
  locale?: SeoLocale;
  path?: string;
}) {
  const translated = (href: string) => {
    if (href.startsWith("/dashboard") || href.startsWith("/account")) return href;
    return locale === "hi" ? `/hi${href === "/" ? "" : href}` : href;
  };
  const switchPath = locale === "hi" ? path : `/hi${path === "/" ? "" : path}`;
  return (
    <LocalizedCopy locale={locale}>
    <footer className="qr-footer">
      <div className="qr-wrap">
        <div className="qr-footer-top">
          <div className="qr-footer-brand">
              <Link href={locale === "hi" ? "/hi" : "/"} className="qr-brand qr-footer-logo">
              <Image src="/brand/logo-mark.png" width={38} height={38} alt="" />
              <span>{brand.name}</span>
            </Link>
            <p>{brand.tagline || "Scan. Tap. Grow."}</p>
              <p className="qr-footer-note">One QR + NFC stand for reviews, menus and WhatsApp orders.</p>
          </div>
          <div className="qr-footer-groups">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map(([label, href]) => <li key={href}><Link href={translated(href)}>{label}</Link></li>)}
                </ul>
              </div>
            ))}
            <div>
              <h2>Talk to us</h2>
              <ul>
                <li><a href={`mailto:${email}`}>{email}</a></li>
                {whatsapp ? <li><a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp support ↗</a></li> : null}
              </ul>
            </div>
          </div>
        </div>
        {credits.length ? (
          <details className="qr-photo-credits">
            <summary>Photo credits</summary>
            <ul>
              {credits.map((credit) => (
                <li key={credit.id}>
                  {credit.alt}: <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.photographer}</a> · {credit.licence}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="qr-footer-bottom">
          <span>© {new Date().getFullYear()} {brand.name}. Made in India.</span>
          <Link className="qr-footer-language" href={switchPath} hrefLang={locale === "hi" ? "en-IN" : "hi-IN"} lang={locale === "hi" ? "en" : "hi"}>{locale === "hi" ? "English" : "हिंदी"}</Link>
          <Link href="#main-content">Back to top ↑</Link>
        </div>
      </div>
    </footer>
    </LocalizedCopy>
  );
}


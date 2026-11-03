import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brand";
import type { PhotoCredit } from "@/lib/landing/credits";
import { talkToUsHref } from "@/lib/landing/money";
import { qrMarketingFonts } from "./fonts";
import { SiteHeader } from "./site-header";
export { Eyebrow, PageIntro, PhoneScreenshot, SectionHeading, TextLink } from "./primitives";

const footerGroups = [
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

export function SiteShell({
  brand,
  children,
  startHref = "/register",
  email = brand.supportEmail || "hello@qr24x7.in",
  whatsapp,
  credits = []
}: {
  brand: Brand;
  children: ReactNode;
  startHref?: string;
  email?: string;
  whatsapp?: string | null;
  credits?: PhotoCredit[];
}) {
  const supportWhatsApp = whatsapp === undefined ? talkToUsHref() : whatsapp;
  return (
    <div className={`${qrMarketingFonts} qr-site`}>
      <a className="qr-skip-link" href="#main-content">Skip to content</a>
      <SiteHeader brand={brand} startHref={startHref} />
      <main id="main-content">{children}</main>
      <SiteFooter brand={brand} email={email} whatsapp={supportWhatsApp} credits={credits} />
    </div>
  );
}

export function SiteFooter({
  brand,
  email,
  whatsapp,
  credits
}: {
  brand: Brand;
  email: string;
  whatsapp?: string | null;
  credits: PhotoCredit[];
}) {
  return (
    <footer className="qr-footer">
      <div className="qr-wrap">
        <div className="qr-footer-top">
          <div className="qr-footer-brand">
            <Link href="/" className="qr-brand qr-footer-logo">
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
                  {group.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
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
          <Link href="#main-content">Back to top ↑</Link>
        </div>
      </div>
    </footer>
  );
}


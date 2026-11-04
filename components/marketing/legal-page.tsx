import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import type { SeoLocale } from "@/lib/seo";
import { LocalizedCopy } from "@/components/marketing/qr-site/i18n";

/**
 * Shared shell for static company/legal pages (About, Privacy, Terms, Refunds).
 * Wraps content in the marketing navbar + footer with clean prose styling.
 */
export async function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  locale = "en",
  path = "/about",
  breadcrumbName,
  children
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  updated?: string;
  locale?: SeoLocale;
  path?: string;
  breadcrumbName?: string;
  children: ReactNode;
}) {
  const brand = await getBrand();
  return (
    <SiteShell brand={brand} locale={locale} path={path} breadcrumbName={breadcrumbName}>
      <LocalizedCopy locale={locale}><section className="qr-legal-intro">
        <div className="qr-wrap">
          {eyebrow ? <p className="qr-eyebrow">{eyebrow}</p> : null}
          <h1>
            {title}
          </h1>
          {intro ? <p>{intro}</p> : null}
          {updated ? <p className="qr-legal-updated">Last updated: {updated}</p> : null}
        </div>
      </section>
      </LocalizedCopy>

      <section className="qr-legal-content">
        <div className="qr-wrap">
          <div className="qr-prose">
            {locale === "hi" ? children : <LocalizedCopy locale={locale}>{children}</LocalizedCopy>}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

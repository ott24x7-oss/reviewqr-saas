import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/marketing/qr-site/ui";

/**
 * Shared shell for static company/legal pages (About, Privacy, Terms, Refunds).
 * Wraps content in the marketing navbar + footer with clean prose styling.
 */
export async function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  children
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  updated?: string;
  children: ReactNode;
}) {
  const brand = await getBrand();
  return (
    <SiteShell brand={brand}>
      <section className="qr-legal-intro">
        <div className="qr-wrap">
          {eyebrow ? <p className="qr-eyebrow">{eyebrow}</p> : null}
          <h1>
            {title}
          </h1>
          {intro ? <p>{intro}</p> : null}
          {updated ? <p className="qr-legal-updated">Last updated: {updated}</p> : null}
        </div>
      </section>

      <section className="qr-legal-content">
        <div className="qr-wrap">
          <div className="qr-prose">
            {children}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

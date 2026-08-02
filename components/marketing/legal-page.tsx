import type { ReactNode } from "react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { getBrand } from "@/lib/brand";

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
  eyebrow?: string;
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  const brand = await getBrand();
  return (
    <main className="min-h-screen bg-background">
      <MarketingNavbar brand={brand} />

      <section className="relative overflow-hidden border-b bg-secondary/40 pt-28 pb-10 sm:pt-32">
        <div className="container max-w-3xl">
          {eyebrow ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            {title}
          </h1>
          {intro ? (
            <p className="mt-3 text-base sm:text-lg text-muted-foreground text-pretty">{intro}</p>
          ) : null}
          {updated ? (
            <p className="mt-4 text-xs text-muted-foreground">Last updated: {updated}</p>
          ) : null}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container max-w-3xl">
          <div
            className="text-[0.975rem] leading-relaxed text-muted-foreground
              [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:tracking-tight
              [&_h2:first-child]:mt-0
              [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-foreground
              [&_p]:mb-4
              [&_a]:text-primary-700 [&_a]:underline [&_a]:underline-offset-2
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-primary-500
              [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:marker:text-primary-500
              [&_li]:pl-1"
          >
            {children}
          </div>
        </div>
      </section>

      <Footer brand={brand} />
    </main>
  );
}

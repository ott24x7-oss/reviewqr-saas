import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import type { SeoLocale } from "@/lib/seo";
import { SiteShell } from "@/components/marketing/qr-site/ui";

export async function LocalPageShell({ children, locale, path }: { children: ReactNode; locale: SeoLocale; path: string }) {
  const brand = await getBrand();
  return <SiteShell brand={brand} locale={locale} path={path} includeBreadcrumb={false} startHref={locale === "hi" ? "/hi/register" : "/register"}>{children}</SiteShell>;
}

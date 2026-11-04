import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryHubContent } from "@/components/local-pages/hub-content";
import { LocalPageShell } from "@/components/local-pages/site-shell";
import { categoryFromSlug, getDirectoryInventory, indexableBusinessCount } from "@/lib/local-seo";
import { buildSeoMetadata } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";

export const revalidate = 3600;

async function data(categorySlug: string) {
  const category = categoryFromSlug(categorySlug);
  const config = await getSeoConfig();
  if (!category || !config.localPages.enabled) return null;
  const inventory = await getDirectoryInventory(config.localPages);
  const rows = [...inventory.pages.entries()]
    .filter(([key, businesses]) => key.startsWith(`${category.slug}/`) && indexableBusinessCount(businesses.length, config.localPages.minBusinessesPerPage))
    .map(([key, businesses]) => ({ city: businesses[0].normalizedCity, count: businesses.length }));
  return { category, rows };
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const result = await data(params.category);
  if (!result?.rows.length) return { title: "पेज नहीं मिला", robots: { index: false, follow: false } };
  const { category } = result;
  return buildSeoMetadata({ path: `/in/${category.slug}`, locale: "hi", title: `${category.hi} के शहर`, description: `शहर के अनुसार ${category.hi} देखें। QR24x7 पर स्थानीय कारोबार के पेज, QR मेनू और ग्राहक समीक्षा की जानकारी पाएँ।` });
}

export default async function CategoryHubPage({ params }: { params: { category: string } }) {
  const result = await data(params.category);
  if (!result?.rows.length) notFound();
  const path = `/in/${result.category.slug}`;
  return <LocalPageShell locale="hi" path={path}><CategoryHubContent category={result.category} rows={result.rows} locale="hi" /></LocalPageShell>;
}

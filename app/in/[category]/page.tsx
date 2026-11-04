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
  if (!result?.rows.length) return { title: "Not found", robots: { index: false, follow: false } };
  const { category } = result;
  return buildSeoMetadata({ path: `/in/${category.slug}`, title: `${category.en} by City`, description: `Browse ${category.en.toLowerCase()} by city. Find local business pages, QR menus and customer review details on QR24x7.`, ogContext: `${result.rows.reduce((sum, row) => sum + row.count, 0)} ${category.en.toLowerCase()} across ${result.rows.length} cities` });
}

export default async function CategoryHubPage({ params }: { params: { category: string } }) {
  const result = await data(params.category);
  if (!result?.rows.length) notFound();
  const path = `/in/${result.category.slug}`;
  return <LocalPageShell locale="en" path={path}><CategoryHubContent category={result.category} rows={result.rows} locale="en" /></LocalPageShell>;
}

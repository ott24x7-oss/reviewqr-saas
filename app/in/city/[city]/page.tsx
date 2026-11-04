import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityHubContent } from "@/components/local-pages/hub-content";
import { LocalPageShell } from "@/components/local-pages/site-shell";
import { cityFromSlug, getDirectoryInventory, indexableBusinessCount } from "@/lib/local-seo";
import { buildSeoMetadata } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";

export const revalidate = 3600;

async function data(citySlug: string) {
  const city = cityFromSlug(citySlug);
  const config = await getSeoConfig();
  if (!city || !config.localPages.enabled) return null;
  const inventory = await getDirectoryInventory(config.localPages);
  const rows = [...inventory.pages.entries()]
    .filter(([key, businesses]) => key.endsWith(`/${city.slug}`) && indexableBusinessCount(businesses.length, config.localPages.minBusinessesPerPage))
    .map(([key, businesses]) => ({ category: businesses[0].category, count: businesses.length }));
  return { city, rows };
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const result = await data(params.city);
  if (!result?.rows.length) return { title: "Not found", robots: { index: false, follow: false } };
  const { city } = result;
  return buildSeoMetadata({ path: `/in/city/${city.slug}`, title: `Local Businesses in ${city.en}`, description: `Browse local businesses in ${city.en} by category. Compare QR24x7 pages, digital menus and customer review details.` });
}

export default async function CityHubPage({ params }: { params: { city: string } }) {
  const result = await data(params.city);
  if (!result?.rows.length) notFound();
  const path = `/in/city/${result.city.slug}`;
  return <LocalPageShell locale="en" path={path}><CityHubContent city={result.city} rows={result.rows} locale="en" /></LocalPageShell>;
}

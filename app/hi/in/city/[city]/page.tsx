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
  if (!result?.rows.length) return { title: "पेज नहीं मिला", robots: { index: false, follow: false } };
  const { city } = result;
  return buildSeoMetadata({ path: `/in/city/${city.slug}`, locale: "hi", title: `${city.hi} में स्थानीय कारोबार`, description: `${city.hi} में श्रेणी के अनुसार स्थानीय कारोबार देखें। QR24x7 पेज, डिजिटल मेनू और ग्राहक समीक्षा की जानकारी पाएँ।`, ogContext: `${city.hi} · ${result.rows.reduce((sum, row) => sum + row.count, 0)} कारोबार` });
}

export default async function CityHubPage({ params }: { params: { city: string } }) {
  const result = await data(params.city);
  if (!result?.rows.length) notFound();
  const path = `/in/city/${result.city.slug}`;
  return <LocalPageShell locale="hi" path={path}><CityHubContent city={result.city} rows={result.rows} locale="hi" /></LocalPageShell>;
}

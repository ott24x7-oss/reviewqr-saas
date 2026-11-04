import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceLandingContent } from "@/components/local-pages/hub-content";
import { LocalPageShell } from "@/components/local-pages/site-shell";
import { cityFromSlug, getDirectoryInventory, serviceSeoTitle } from "@/lib/local-seo";
import { buildSeoMetadata } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";

export const revalidate = 3600;
async function data(citySlug: string) {
  const config = await getSeoConfig();
  const city = cityFromSlug(citySlug);
  if (!city || !config.localPages.enabled) return null;
  const inventory = await getDirectoryInventory(config.localPages);
  const businesses = inventory.byCity.get(city.slug) || [];
  if (!businesses.length && !inventory.targets.some((target) => target.slug === city.slug)) return null;
  return { city, businesses, inventory, minBusinessesPerPage: config.localPages.minBusinessesPerPage };
}
export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const result = await data(params.city);
  if (!result) return { title: "पेज नहीं मिला", robots: { index: false, follow: false } };
  const title = serviceSeoTitle(result.city, "hi");
  return buildSeoMetadata({ path: `/qr-code-for-google-reviews/${result.city.slug}`, locale: "hi", title, description: `${result.city.hi} के कारोबार QR24x7 से Google समीक्षा पाएँ, QR मेनू साझा करें और WhatsApp ऑर्डर लें।`, ogContext: `${result.city.hi} · ${result.businesses.length} कारोबार` });
}
export default async function ReviewQrCityPage({ params }: { params: { city: string } }) {
  const result = await data(params.city);
  if (!result) notFound();
  const path = `/qr-code-for-google-reviews/${result.city.slug}`;
  return <LocalPageShell locale="hi" path={path}><ServiceLandingContent city={result.city} businesses={result.businesses} allBusinesses={result.inventory.businesses} minBusinessesPerPage={result.minBusinessesPerPage} locale="hi" /></LocalPageShell>;
}

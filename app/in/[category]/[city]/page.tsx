import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryContent } from "@/components/local-pages/directory-content";
import { LocalPageShell } from "@/components/local-pages/site-shell";
import { directorySeoTitle, getDirectoryPage } from "@/lib/local-seo";
import { buildSeoMetadata } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";

export const revalidate = 3600;
type Params = { category: string; city: string };

async function data(params: Params) {
  const config = await getSeoConfig();
  const page = await getDirectoryPage(params.category, params.city, config.localPages);
  return { config, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { page } = await data(params);
  if (!page || page.businesses.length === 0) return { title: "Not found", robots: { index: false, follow: false } };
  const title = directorySeoTitle(page.category, page.city, "en");
  const metadata = await buildSeoMetadata({ path: `/in/${params.category}/${params.city}`, title, description: `Compare ${page.category.en.toLowerCase()} in ${page.city.en}. View local business pages, customer ratings, menus and WhatsApp ordering details.`, ogContext: `${page.city.en} · ${page.businesses.length} ${page.category.en.toLowerCase()}` });
  return page.indexable ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function LocalDirectoryPage({ params }: { params: Params }) {
  const { config, page } = await data(params);
  if (!page || page.businesses.length === 0) notFound();
  return <LocalPageShell locale="en" path={`/in/${page.category.slug}/${page.city.slug}`}><DirectoryContent category={page.category} city={page.city} businesses={page.businesses} inventory={page.inventory} config={config.localPages} locale="en" /></LocalPageShell>;
}

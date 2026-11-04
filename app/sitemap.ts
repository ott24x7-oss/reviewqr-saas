import type { MetadataRoute } from "next";
import { listPublicPlans } from "@/lib/plans/public";
import { SEO_STATIC_ROUTES, publicLocalePath } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";
import { directoryPagePaths, getDirectoryInventory, getListedBusinessSitemapRows } from "@/lib/local-seo";

const baseUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in").origin;
  } catch {
    return "https://qr24x7.in";
  }
})();

function absolutePath(path: string) {
  return `${baseUrl}${path === "/" ? "/" : path}`;
}

export const dynamic = "force-dynamic";

const KNOWN_MODIFIED: Record<string, Date> = {
  "/privacy": new Date("2026-10-22T00:00:00.000Z"),
  "/terms": new Date("2026-10-21T00:00:00.000Z"),
  "/refund": new Date("2026-08-02T00:00:00.000Z")
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoConfig();
  let planPaths: string[] = [];
  try {
    const plans = await listPublicPlans();
    planPaths = plans.map((plan) => `/plans/${plan.slug}`);
  } catch {
    planPaths = [];
  }
  const routes = [
    ...SEO_STATIC_ROUTES.map((route) => ({ path: route.path, translated: route.translated })),
    ...planPaths.map((path) => ({ path, translated: true }))
  ];
  const entries: MetadataRoute.Sitemap = [];
  for (const route of routes) {
    const enPath = publicLocalePath(route.path, "en");
    const hiPath = publicLocalePath(route.path, "hi");
    const enNoindex = Boolean(seo.overrides[enPath]?.noindex);
    const hiNoindex = Boolean(seo.overrides[hiPath]?.noindex);
    const languages = route.translated ? {
      ...(!enNoindex ? { "en-IN": absolutePath(enPath) } : {}),
      ...(!hiNoindex ? { "hi-IN": absolutePath(hiPath) } : {}),
      "x-default": absolutePath(enNoindex ? hiPath : enPath)
    } : undefined;
    for (const path of [enPath, hiPath]) {
      if (seo.overrides[path]?.noindex) continue;
      const home = path === "/" || path === "/hi";
      entries.push({
        url: absolutePath(path),
        ...(KNOWN_MODIFIED[route.path] ? { lastModified: KNOWN_MODIFIED[route.path] } : {}),
        changeFrequency: home ? "weekly" : route.path.startsWith("/plans/") ? "weekly" : "monthly",
        priority: home ? 1 : route.path.startsWith("/plans/") ? 0.8 : 0.6,
        ...(languages ? { alternates: { languages } } : {})
      });
    }
  }
  const inventory = await getDirectoryInventory(seo.localPages);
  const listedBusinessRows = await getListedBusinessSitemapRows();
  const localPaths = directoryPagePaths(seo.localPages, inventory);
  const translatedPaths = [
    ...localPaths.categoryPages.map((key) => `/in/${key}`),
    ...localPaths.categoryHubs.map((category) => `/in/${category}`),
    ...localPaths.cityHubs.map((city) => `/in/city/${city}`),
    ...localPaths.serviceCities.map((city) => `/qr-code-for-google-reviews/${city}`)
  ];
  for (const path of translatedPaths) {
    const enPath = publicLocalePath(path, "en");
    const hiPath = publicLocalePath(path, "hi");
    const languages = { "en-IN": absolutePath(enPath), "hi-IN": absolutePath(hiPath), "x-default": absolutePath(enPath) };
    for (const localizedPath of [enPath, hiPath]) entries.push({ url: absolutePath(localizedPath), changeFrequency: "weekly", priority: 0.65, alternates: { languages } });
  }
  for (const business of listedBusinessRows) entries.push({ url: absolutePath(`/${business.slug}`), changeFrequency: "weekly", priority: 0.6 });
  return entries;
}

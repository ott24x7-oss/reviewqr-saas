import type { MetadataRoute } from "next";
import { listPublicPlans } from "@/lib/plans/public";
import { SEO_STATIC_ROUTES, publicLocalePath } from "@/lib/seo";
import { getSeoConfig } from "@/lib/settings";
import { directoryPagePaths, getDirectoryInventory, getListedBusinessSitemapRows, LOCAL_CATEGORIES, normalizeCity } from "@/lib/local-seo";
import { prisma } from "@/lib/db";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoConfig();
  let planRows: Array<{ path: string; lastModified: Date }> = [];
  try {
    const plans = await listPublicPlans();
    planRows = plans.map((plan) => ({ path: `/plans/${plan.slug}`, lastModified: plan.updatedAt }));
  } catch {
    planRows = [];
  }
  const blogPosts = await prisma.blogPost.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, locale: true, updatedAt: true, translationKey: true } }).catch(() => []);
  const routes = [
    ...SEO_STATIC_ROUTES.map((route) => ({ path: route.path, translated: route.translated, lastModified: new Date(`${route.updatedAt}T00:00:00.000Z`) })),
    ...planRows.map((plan) => ({ ...plan, translated: true }))
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
        lastModified: route.lastModified,
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
  const selectedIndustrySlugs = ["restaurants", "cafes", "bakeries", "salons", "clinics", "kirana-stores", "hotels", "gyms"];
  const industryPaths = LOCAL_CATEGORIES.filter((category) => selectedIndustrySlugs.includes(category.slug)).map((category) => `/for/${category.slug}`);
  for (const path of [...translatedPaths, ...industryPaths, "/compare/commission-free-whatsapp-ordering"]) {
    const enPath = publicLocalePath(path, "en");
    const hiPath = publicLocalePath(path, "hi");
    const enNoindex = Boolean(seo.overrides[enPath]?.noindex);
    const hiNoindex = Boolean(seo.overrides[hiPath]?.noindex);
    const languages = { ...(!enNoindex ? { "en-IN": absolutePath(enPath) } : {}), ...(!hiNoindex ? { "hi-IN": absolutePath(hiPath) } : {}), "x-default": absolutePath(enNoindex ? hiPath : enPath) };
    const lastModified = industryPaths.includes(path) || path.startsWith("/compare/") ? new Date("2026-11-04T00:00:00.000Z") : maxDateForPath(path, inventory, listedBusinessRows);
    for (const localizedPath of [enPath, hiPath]) if (!seo.overrides[localizedPath]?.noindex) entries.push({ url: absolutePath(localizedPath), lastModified, changeFrequency: "weekly", priority: 0.65, alternates: { languages } });
  }
  const blogIndexLastModified = maxDate(blogPosts.map((post) => post.updatedAt), new Date("2026-11-04T00:00:00.000Z"));
  const blogIndexLanguages = { ...(!seo.overrides["/blog"]?.noindex ? { "en-IN": absolutePath("/blog") } : {}), ...(!seo.overrides["/hi/blog"]?.noindex ? { "hi-IN": absolutePath("/hi/blog") } : {}), "x-default": absolutePath("/blog") };
  if (!seo.overrides["/blog"]?.noindex) entries.push({ url: absolutePath("/blog"), lastModified: blogIndexLastModified, changeFrequency: "weekly", priority: 0.7, alternates: { languages: blogIndexLanguages } });
  if (!seo.overrides["/hi/blog"]?.noindex) entries.push({ url: absolutePath("/hi/blog"), lastModified: blogIndexLastModified, changeFrequency: "weekly", priority: 0.7, alternates: { languages: blogIndexLanguages } });
  for (const post of blogPosts) {
    const path = `${post.locale === "hi" ? "/hi" : ""}/blog/${post.slug}`;
    const twin = post.translationKey ? blogPosts.find((candidate) => candidate.translationKey === post.translationKey && candidate.locale !== post.locale) : undefined;
    if (seo.overrides[path]?.noindex) continue;
    const enPath = post.locale === "en" ? path : twin ? `/blog/${twin.slug}` : "";
    const hiPath = post.locale === "hi" ? path : twin ? `/hi/blog/${twin.slug}` : "";
    const alternates = twin ? { languages: { "en-IN": absolutePath(enPath), "hi-IN": absolutePath(hiPath), "x-default": absolutePath(enPath) } } : {};
    entries.push({ url: absolutePath(path), lastModified: post.updatedAt, changeFrequency: "monthly", priority: 0.7, ...alternates });
  }
  for (const business of listedBusinessRows) if (!seo.overrides[`/${business.slug}`]?.noindex) entries.push({ url: absolutePath(`/${business.slug}`), lastModified: business.updatedAt, changeFrequency: "weekly", priority: 0.6 });
  return entries;
}

function maxDateForPath(path: string, inventory: Awaited<ReturnType<typeof getDirectoryInventory>>, businessRows: Awaited<ReturnType<typeof getListedBusinessSitemapRows>>) {
  if (path.startsWith("/qr-code-for-google-reviews/")) {
    const city = path.split("/").pop();
    return maxDate(businessRows.filter((row) => normalizeCity(row.city)?.slug === city).map((row) => row.updatedAt), new Date("2026-11-04T00:00:00.000Z"));
  }
  if (path.startsWith("/in/")) {
    const pieces = path.slice(4).split("/");
    if (pieces[0] === "city") return maxDate(inventory.byCity.get(pieces[1])?.map((row) => row.updatedAt) || [], new Date("2026-11-04T00:00:00.000Z"));
    if (pieces.length === 2) return maxDate(inventory.pages.get(`${pieces[0]}/${pieces[1]}`)?.map((row) => row.updatedAt) || [], new Date("2026-11-04T00:00:00.000Z"));
    if (pieces.length === 1) return maxDate(inventory.businesses.filter((row) => row.category.slug === pieces[0]).map((row) => row.updatedAt), new Date("2026-11-04T00:00:00.000Z"));
  }
  return new Date("2026-11-04T00:00:00.000Z");
}

function maxDate(values: Date[], fallback = new Date("2026-11-04T00:00:00.000Z")) {
  if (!values.length) return fallback;
  return values.reduce((max, value) => value > max ? value : max, values[0]);
}

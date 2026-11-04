import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { getSeoConfig } from "@/lib/settings";
import { listPublicPlans } from "@/lib/plans/public";
import { fetchRenderedSeoChecklist, planSeoDescription, SEO_STATIC_ROUTES, publicLocalePath } from "@/lib/seo";
import { PageHeader } from "@/components/admin/ui/primitives";
import { SeoForm, type SeoRouteRow } from "./seo-form";
import { directoryPagePaths, getDirectoryInventory } from "@/lib/local-seo";
import { industryCopy, INDUSTRY_SLUGS, industryCategory } from "@/lib/industry-pages";
import { comparisonCopy, COMPARISON_PATH } from "@/lib/comparison";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SEO settings", robots: { index: false, follow: false } };

export default async function AdminSeoPage() {
  await requireAdminPage();
  const [seo, plans, blogPosts] = await Promise.all([getSeoConfig(), listPublicPlans().catch(() => []), prisma.blogPost.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, locale: true, title: true, translationKey: true } }).catch(() => [])]);
  const routeDefs = [
    ...SEO_STATIC_ROUTES.map((route) => ({ path: route.path, translated: route.translated, label: route.titleEn, titleEn: route.titleEn, titleHi: route.titleHi })),
    ...plans.map((plan) => ({ path: `/plans/${plan.slug}`, translated: true, label: plan.nameEn, titleEn: plan.nameEn, titleHi: plan.nameHi, descriptionEn: planSeoDescription(plan.nameEn, plan.descriptionEn, "en"), descriptionHi: planSeoDescription(plan.nameHi, plan.descriptionHi, "hi") })),
    ...INDUSTRY_SLUGS.map((slug) => {
      const category = industryCategory(slug)!;
      return { path: `/for/${slug}`, translated: true, label: category.en, titleEn: industryCopy(slug, "en").h1, titleHi: industryCopy(slug, "hi").h1, descriptionEn: industryCopy(slug, "en").intro, descriptionHi: industryCopy(slug, "hi").intro };
    }),
    { path: COMPARISON_PATH, translated: true, label: "WhatsApp ordering comparison", titleEn: comparisonCopy("en").title, titleHi: comparisonCopy("hi").title, descriptionEn: comparisonCopy("en").intro, descriptionHi: comparisonCopy("hi").intro }
  ];
  const localeByTranslation = new Map<string, Set<string>>();
  for (const post of blogPosts) if (post.translationKey) localeByTranslation.set(post.translationKey, (localeByTranslation.get(post.translationKey) || new Set()).add(post.locale));
  const translatedBlogKeys = new Set([...localeByTranslation].filter(([, locales]) => locales.has("en") && locales.has("hi")).map(([key]) => key));
  const blogPaths = blogPosts.map((post) => ({ path: (post.locale === "hi" ? "/hi" : "") + "/blog/" + post.slug, label: `${post.locale === "hi" ? "हिंदी" : "English"} · ${post.title}`, locale: post.locale, translationKey: post.translationKey }));
  const overrideRoutes: SeoRouteRow[] = [...routeDefs.flatMap((route) => [
    { path: publicLocalePath(route.path, "en"), label: `English · ${route.label}` },
    { path: publicLocalePath(route.path, "hi"), label: `हिंदी · ${route.titleHi}` }
  ]), ...blogPaths.map((row) => ({ path: row.path, label: row.label }))];
  const checklistRoutes = [...routeDefs.flatMap((route) => ([
    { path: route.path, locale: "en" as const, hreflangExpected: route.translated },
    { path: route.path, locale: "hi" as const, hreflangExpected: route.translated }
  ])), ...blogPaths.map((row) => ({ path: row.path, locale: row.locale as "en" | "hi", hreflangExpected: Boolean(row.translationKey && translatedBlogKeys.has(row.translationKey)) }))];
  const checklist = await fetchRenderedSeoChecklist(checklistRoutes);
  const inventory = await getDirectoryInventory(seo.localPages);
  const localPaths = directoryPagePaths(seo.localPages, inventory);
  const generatedPages = [
    ...[...inventory.pages.entries()].map(([key, businesses]) => ({ path: `/in/${key}`, count: businesses.length, indexable: seo.localPages.enabled && businesses.length >= seo.localPages.minBusinessesPerPage, kind: "Directory" })),
    ...localPaths.categoryHubs.map((slug) => ({ path: `/in/${slug}`, count: inventory.businesses.filter((business) => business.category.slug === slug).length, indexable: seo.localPages.enabled, kind: "Category hub" })),
    ...localPaths.cityHubs.map((slug) => ({ path: `/in/city/${slug}`, count: inventory.byCity.get(slug)?.length || 0, indexable: seo.localPages.enabled, kind: "City hub" })),
    ...localPaths.serviceCities.map((slug) => ({ path: `/qr-code-for-google-reviews/${slug}`, count: inventory.byCity.get(slug)?.length || 0, indexable: seo.localPages.enabled, kind: "Service landing" })),
    ...inventory.businesses.map((business) => ({ path: `/${business.slug}`, count: 1, indexable: seo.localPages.enabled, kind: "Business page" }))
  ];

  return <div className="space-y-5">
    <PageHeader title="SEO settings" subtitle="Manage public page search metadata, verification, schema, analytics, and the technical SEO checklist." />
    <SeoForm initial={seo} routes={overrideRoutes} checklist={checklist} generatedPages={generatedPages} />
  </div>;
}

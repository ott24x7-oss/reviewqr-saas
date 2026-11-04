import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { getSeoConfig } from "@/lib/settings";
import { listPublicPlans } from "@/lib/plans/public";
import { fetchRenderedSeoChecklist, planSeoDescription, SEO_STATIC_ROUTES, publicLocalePath } from "@/lib/seo";
import { PageHeader } from "@/components/admin/ui/primitives";
import { SeoForm, type SeoRouteRow } from "./seo-form";
import { directoryPagePaths, getDirectoryInventory } from "@/lib/local-seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SEO settings", robots: { index: false, follow: false } };

export default async function AdminSeoPage() {
  await requireAdminPage();
  const [seo, plans] = await Promise.all([getSeoConfig(), listPublicPlans().catch(() => [])]);
  const routeDefs = [
    ...SEO_STATIC_ROUTES.map((route) => ({ path: route.path, translated: route.translated, label: route.titleEn, titleEn: route.titleEn, titleHi: route.titleHi })),
    ...plans.map((plan) => ({ path: `/plans/${plan.slug}`, translated: true, label: plan.nameEn, titleEn: plan.nameEn, titleHi: plan.nameHi, descriptionEn: planSeoDescription(plan.nameEn, plan.descriptionEn, "en"), descriptionHi: planSeoDescription(plan.nameHi, plan.descriptionHi, "hi") }))
  ];
  const overrideRoutes: SeoRouteRow[] = routeDefs.flatMap((route) => [
    { path: publicLocalePath(route.path, "en"), label: `English · ${route.label}` },
    { path: publicLocalePath(route.path, "hi"), label: `हिंदी · ${route.titleHi}` }
  ]);
  const checklistRoutes = routeDefs.flatMap((route) => ([
    { path: route.path, locale: "en" as const, hreflangExpected: route.translated },
    { path: route.path, locale: "hi" as const, hreflangExpected: route.translated }
  ]));
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

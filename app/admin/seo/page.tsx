import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { getSeoConfig } from "@/lib/settings";
import { listPublicPlans } from "@/lib/plans/public";
import { fetchRenderedSeoChecklist, planSeoDescription, SEO_STATIC_ROUTES, publicLocalePath } from "@/lib/seo";
import { PageHeader } from "@/components/admin/ui/primitives";
import { SeoForm, type SeoRouteRow } from "./seo-form";

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

  return <div className="space-y-5">
    <PageHeader title="SEO settings" subtitle="Manage public page search metadata, verification, schema, analytics, and the technical SEO checklist." />
    <SeoForm initial={seo} routes={overrideRoutes} checklist={checklist} />
  </div>;
}

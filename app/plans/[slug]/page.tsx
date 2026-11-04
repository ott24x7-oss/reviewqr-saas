import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/marketing/qr-site/plan-detail";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";
import { listStandAddons } from "@/lib/landing/hardware";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingCopy } from "@/lib/plans/pricing-copy";
import { fallbackImageName } from "@/lib/plans/categories";
import { DURATION_LABELS } from "@/lib/plans/catalog";
import { buildSeoMetadata, planSeoDescription, planSeoTitle } from "@/lib/seo";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type Search = { duration?: string };

async function load(slug: string) {
  const [plans, brand, hardware] = await Promise.all([listPublicPlans(), getBrand(), listStandAddons()]);
  const plan = plans.find((item) => item.slug === slug) || null;
  return { plan, brand, hardware };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { plan, brand } = await load(params.slug);
  if (!plan) return { title: "Plan" };
  const description = planSeoDescription(plan.nameEn, plan.descriptionEn, "en");
  const imagePath = plan.imageUrl && !plan.imageUrl.startsWith("data:")
    ? plan.imageUrl
    : `/landing/${fallbackImageName(plan.category)}-1600.webp`;
  return buildSeoMetadata({ path: `/plans/${plan.slug}`, title: planSeoTitle(plan.nameEn, plan.modules, "en"), description, image: imagePath });
}

export default async function PlanPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const locale = getRequestLocale();
  const [{ plan, brand, hardware }, copy] = await Promise.all([load(params.slug), getPricingCopy()]);
  if (!plan) notFound();
  const base = (brand.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const imagePath = plan.imageUrl && !plan.imageUrl.startsWith("data:")
    ? plan.imageUrl
    : `/landing/${fallbackImageName(plan.category)}-1600.webp`;
  const image = imagePath.startsWith("http") ? imagePath : `${base}${imagePath}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: locale === "hi" ? plan.nameHi : plan.nameEn,
    description: (locale === "hi" ? plan.descriptionHi : plan.descriptionEn) || plan.nameEn,
    image,
    inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
    brand: { "@type": "Brand", name: brand.name },
    offers: plan.prices.map((price) => ({
      "@type": "Offer",
      name: DURATION_LABELS[price.duration][locale],
      priceCurrency: "INR",
      price: (price.pricePaise / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${base}/register?plan=${encodeURIComponent(plan.slug)}&duration=${price.duration}`
    }))
  };

  return (
    <SiteShell brand={brand} locale={locale} path={`/plans/${plan.slug}`} breadcrumbName={locale === "hi" ? plan.nameHi : plan.nameEn}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PlanDetail plan={plan} hardware={hardware} initialDuration={searchParams.duration} faqs={copy.faqs} locale={locale} />
    </SiteShell>
  );
}

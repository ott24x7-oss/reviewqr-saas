import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { marketingFontClass } from "@/components/brand/fonts";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { PlanDetail } from "@/components/marketing/landing-v2/plan-detail";
import { getBrand } from "@/lib/brand";
import { listStandAddons } from "@/lib/landing/hardware";
import { listPublicPlans } from "@/lib/plans/public";
import { fallbackImageName } from "@/lib/plans/categories";
import { DURATION_LABELS } from "@/lib/plans/catalog";

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
  const description = plan.descriptionEn || `${plan.nameEn} for Google reviews, a menu, or WhatsApp orders.`;
  const imagePath =
    plan.imageUrl && !plan.imageUrl.startsWith("data:")
      ? plan.imageUrl
      : `/landing/${fallbackImageName(plan.category)}-1600.webp`;
  return {
    title: { absolute: `${plan.nameEn} | ${brand.name}` },
    description,
    openGraph: {
      title: plan.nameEn,
      description,
      images: [imagePath]
    }
  };
}

export default async function PlanPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { plan, brand, hardware } = await load(params.slug);
  if (!plan) notFound();
  const base = (brand.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const imagePath =
    plan.imageUrl && !plan.imageUrl.startsWith("data:")
      ? plan.imageUrl
      : `/landing/${fallbackImageName(plan.category)}-1600.webp`;
  const image = imagePath.startsWith("http") ? imagePath : `${base}${imagePath}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: plan.nameEn,
    description: plan.descriptionEn || plan.nameEn,
    image,
    brand: { "@type": "Brand", name: brand.name },
    offers: plan.prices.map((price) => ({
      "@type": "Offer",
      name: DURATION_LABELS[price.duration].en,
      priceCurrency: "INR",
      price: (price.pricePaise / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${base}/register?plan=${encodeURIComponent(plan.slug)}&duration=${price.duration}`
    }))
  };

  return (
    <LandingLangProvider>
      <main className={`marketing-page min-h-screen overflow-x-hidden ${marketingFontClass}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <MarketingNavbar brand={brand} />
        <PlanDetail plan={plan} hardware={hardware} initialDuration={searchParams.duration} />
        <Footer brand={brand} />
      </main>
    </LandingLangProvider>
  );
}

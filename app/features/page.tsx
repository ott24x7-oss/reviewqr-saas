import type { Metadata } from "next";
import { FeaturesMarketing } from "@/components/marketing/qr-site/marketing-pages";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const description = "Reviews, menu, WhatsApp store, profile page, QR and NFC stands, and growth tools on one stand.";
  return {
    title: { absolute: `Features | ${brand.name}` },
    description,
    openGraph: {
      title: `Features | ${brand.name}`,
      description,
      images: ["/landing/og-1600.webp"]
    }
  };
}

export default async function FeaturesPage() {
  const [catalog, legacy, brand] = await Promise.all([listPublicPlans(), getPricingConfig(), getBrand()]);
  return <SiteShell brand={brand}><FeaturesMarketing plans={catalog} legacy={legacy} /></SiteShell>;
}

import type { Metadata } from "next";
import { HowItWorksMarketing } from "@/components/marketing/qr-site/marketing-pages";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const description = "Choose a plan, get a QR + NFC stand, set up in 10 minutes, and track reviews and WhatsApp orders.";
  return {
    title: { absolute: `How it works | ${brand.name}` },
    description,
    openGraph: {
      title: `How it works | ${brand.name}`,
      description,
      images: ["/landing/og-1600.webp"]
    }
  };
}

export default async function HowItWorksPage() {
  const brand = await getBrand();
  return <SiteShell brand={brand}><HowItWorksMarketing brand={brand} startHref="/register" /></SiteShell>;
}

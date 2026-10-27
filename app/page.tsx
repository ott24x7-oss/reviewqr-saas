import { LegacyHashRedirect } from "@/components/marketing/landing/legacy-hash-redirect";
import { HomeV3 } from "@/components/marketing/home-v3/home";
import type { Metadata } from "next";
import { listActivePlanPrices, listPublicPlans } from "@/lib/plans/public";
import { buyHref } from "@/lib/plans/categories";
import { freePlanOffer } from "@/lib/landing/anchor";
import { getBrand } from "@/lib/brand";
import { talkToUsHref } from "@/lib/landing/money";
import { landingTrust } from "@/lib/landing/proof";
import { landingPhotoCredits } from "@/lib/landing/credits";
import { landingStories } from "@/lib/landing/stories";
import { listStandAddons } from "@/lib/landing/hardware";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const title = `${brand.name} — ${brand.tagline}`;
  const description = `${brand.tagline}. Google reviews, menu and WhatsApp orders from one QR + NFC stand. No commission. Setup in 10 minutes. Made in India.`;
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/landing/og-1600.webp", width: 1200, height: 630, alt: "QR and NFC stand on a café counter" }]
    }
  };
}

export default async function HomePage() {
  const [catalog, priced, brand, trust, hardware] = await Promise.all([
    listPublicPlans(),
    listActivePlanPrices(),
    getBrand(),
    landingTrust(),
    listStandAddons()
  ]);
  const free = freePlanOffer(priced);
  const startHref = free ? buyHref(free.slug, free.duration) : "/register";
  return (
    <>
      <link rel="preload" as="image" href="/landing/photos/kirana-640.avif" type="image/avif" fetchPriority="high" />
      <LegacyHashRedirect />
      <HomeV3
        name={brand.name}
        email={brand.supportEmail || "hello@qr24x7.in"}
        trust={trust}
        startHref={startHref}
        whatsapp={talkToUsHref()}
        plans={catalog}
        hardware={hardware}
        credits={landingPhotoCredits()}
        stories={landingStories()}
      />
    </>
  );
}

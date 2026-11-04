import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTap } from "@/components/tap/public-page";
import { metadataForBusiness } from "@/lib/tap/meta";
import { isReservedSlug } from "@/lib/tap/reserved-slugs";
import { loadPublicSlug } from "@/lib/tap/resolve";
import { buildBusinessJsonLd, getListedBusinessBySlug } from "@/lib/local-seo";
import { jsonLdString } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (isReservedSlug(params.slug)) return { title: "Not found" };
  const record = await loadPublicSlug(params.slug);
  if (record.status !== "active" && record.status !== "limited") return { title: "Not found" };
  return metadataForBusiness(record, true);
}

export default async function BusinessSlugPage({ params }: { params: { slug: string } }) {
  if (isReservedSlug(params.slug)) notFound();
  const record = await loadPublicSlug(params.slug);
  if (record.status !== "active" && record.status !== "limited") notFound();
  const directoryBusiness = record.status === "active" ? await getListedBusinessBySlug(params.slug) : null;
  const localBusinessSchema = directoryBusiness ? buildBusinessJsonLd(directoryBusiness, directoryBusiness.ratingAverage, directoryBusiness.reviewCount) : null;
  const publicPage = record.shortCode
    ? <PublicTap code={record.shortCode} channel="q" src="link" countScan />
    : <PublicTap code="" channel="q" src="link" countScan={false} record={record} />;
  return <>{localBusinessSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(localBusinessSchema) }} /> : null}{publicPage}</>;
}

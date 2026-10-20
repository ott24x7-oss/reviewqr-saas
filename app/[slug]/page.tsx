import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTap } from "@/components/tap/public-page";
import { isReservedSlug } from "@/lib/tap/reserved-slugs";
import { loadPublicSlug } from "@/lib/tap/resolve";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (isReservedSlug(params.slug)) return { title: "Not found" };
  const record = await loadPublicSlug(params.slug);
  if (record.status !== "active" && record.status !== "limited") return { title: "Not found" };
  return { title: record.business.name };
}

export default async function BusinessSlugPage({ params }: { params: { slug: string } }) {
  if (isReservedSlug(params.slug)) notFound();
  const record = await loadPublicSlug(params.slug);
  if (record.status !== "active" && record.status !== "limited") notFound();
  if (record.shortCode) {
    return <PublicTap code={record.shortCode} channel="q" src="link" countScan />;
  }
  return <PublicTap code="" channel="q" src="link" countScan={false} record={record} />;
}

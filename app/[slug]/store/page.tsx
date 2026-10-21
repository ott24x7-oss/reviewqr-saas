import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMenu } from "@/components/tap/public-menu";
import { isReservedSlug } from "@/lib/tap/reserved-slugs";
import { loadPublicSlug } from "@/lib/tap/resolve";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (isReservedSlug(params.slug)) return { title: "Not found" };
  const record = await loadPublicSlug(params.slug);
  if (record.status !== "active" && record.status !== "limited") return { title: "Not found" };
  return { title: `${record.business.name} store` };
}

export default async function SlugStorePage({ params }: { params: { slug: string } }) {
  if (isReservedSlug(params.slug)) notFound();
  const record = await loadPublicSlug(params.slug);
  if ((record.status !== "active" && record.status !== "limited") || !record.shortCode) notFound();
  return <PublicMenu code={record.shortCode} channel="q" homeHref={`/${record.business.slug}`} hideTable />;
}

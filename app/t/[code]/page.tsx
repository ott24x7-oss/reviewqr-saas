import type { Metadata } from "next";
import { PublicTap } from "@/components/tap/public-page";
import { metadataForBusiness } from "@/lib/tap/meta";
import { loadPublicTap } from "@/lib/tap/resolve";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const record = await loadPublicTap(params.code);
  return metadataForBusiness(record, false);
}

export default function NfcTapPage({
  params,
  searchParams
}: {
  params: { code: string };
  searchParams: { src?: string };
}) {
  return <PublicTap code={params.code} channel="t" src={searchParams.src} countScan />;
}

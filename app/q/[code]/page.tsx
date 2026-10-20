import type { Metadata } from "next";
import { PublicTap } from "@/components/tap/public-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tap page",
  robots: { index: false, follow: false }
};

export default function QrTapPage({
  params,
  searchParams
}: {
  params: { code: string };
  searchParams: { src?: string };
}) {
  return <PublicTap code={params.code} channel="q" src={searchParams.src} countScan />;
}

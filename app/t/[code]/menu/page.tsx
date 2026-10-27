import type { Metadata } from "next";
import { PublicMenu } from "@/components/tap/public-menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu",
  robots: { index: false, follow: false }
};

export default function NfcMenuPage({
  params,
  searchParams
}: {
  params: { code: string };
  searchParams?: { view?: string };
}) {
  return <PublicMenu code={params.code} channel="t" view={searchParams?.view === "services" ? "services" : "menu"} />;
}

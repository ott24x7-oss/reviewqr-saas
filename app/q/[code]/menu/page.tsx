import type { Metadata } from "next";
import { PublicMenu } from "@/components/tap/public-menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu",
  robots: { index: false, follow: false }
};

export default function QrMenuPage({
  params,
  searchParams
}: {
  params: { code: string };
  searchParams?: { view?: string };
}) {
  return <PublicMenu code={params.code} channel="q" view={searchParams?.view === "services" ? "services" : "menu"} />;
}

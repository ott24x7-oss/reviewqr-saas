import type { Metadata } from "next";
import { StatusCard } from "@/components/tap/status-card";
import { tapText } from "@/lib/tap/i18n";

export const metadata: Metadata = {
  title: "QR not found",
  robots: { index: false, follow: false }
};

export default function QrNotFound() {
  return <StatusCard title={tapText("en", "notFoundTitle")} />;
}

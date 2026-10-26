import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/admin/ui/primitives";
import { KitGallery } from "./kit-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Component kit",
  robots: { index: false, follow: false }
};

export default function AdminKitPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <KitGallery />
    </Suspense>
  );
}

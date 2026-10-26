"use client";

import { AdminErrorState } from "@/components/admin/ui/controls";
import { PageHeader } from "@/components/admin/ui/primitives";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <PageHeader title="This admin page hit a problem" subtitle="Your changes have not been confirmed. Retry to load the page again." />
      <AdminErrorState message="Could not load this screen." retry={reset} />
    </div>
  );
}

import { PageHeader } from "@/components/admin/ui/primitives";
import { loadAdminInbox } from "@/lib/admin/inbox";
import { adminSearchParams } from "@/lib/admin/web-search";
import { InboxBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  if (!search.get("segment")) search.set("segment", "agents");
  const result = await loadAdminInbox(search);
  if (!result.ok) return <p className="text-sm text-rose-600">{result.error}</p>;
  return (
    <div>
      <PageHeader title="Inbox" subtitle="Everything that is waiting on an admin." />
      <InboxBoard segment={result.data.segment} counts={result.data.counts} items={result.data.items} />
    </div>
  );
}

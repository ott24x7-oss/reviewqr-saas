import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { listAdminTickets } from "@/lib/admin/support-admin";
import { AdminCard, AdminEmptyState, AdminButton } from "@/components/admin/ui/controls";
import { PageHeader, RelativeTime, StatusBadge } from "@/components/admin/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requireAdminPage();
  const result = await listAdminTickets(new URLSearchParams("limit=50"));
  if (!result.ok) throw new Error(result.error);
  return <div className="space-y-5"><PageHeader title="Support tickets" subtitle={`${result.data.items.length} recent customer conversations`} />
    {result.data.items.length ? <div className="space-y-3">{result.data.items.map((ticket) => <AdminCard key={ticket.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="min-w-0"><Link className="font-semibold underline-offset-4 hover:underline" href={`/admin/support/${ticket.id}`}>{ticket.subject}</Link><p className="mt-1 text-sm text-zinc-500">{ticket.name || ticket.email} · {ticket.email} · updated <RelativeTime value={ticket.updatedAt} /></p></div><div className="flex items-center gap-3"><StatusBadge value={ticket.status} /><Link href={`/admin/support/${ticket.id}`}><AdminButton variant="outline">Open ticket</AdminButton></Link></div></AdminCard>)}</div> : <AdminEmptyState title="No support tickets" description="Customer conversations will show here when they need help." />}
  </div>;
}

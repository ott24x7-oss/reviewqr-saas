import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { loadAdminTicket } from "@/lib/admin/support-admin";
import { SupportReplyForm } from "../reply-form";
import { AdminCard, AdminButton, AdminEmptyState } from "@/components/admin/ui/controls";
import { PageHeader, RelativeTime, StatusBadge } from "@/components/admin/ui/primitives";
import { DetailLayout, MetaCard } from "@/components/admin/ui/detail";

export const dynamic = "force-dynamic";

export default async function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  await requireAdminPage();
  const { id } = await params;
  const result = await loadAdminTicket(id);
  if (!result.ok) notFound();
  const ticket = result.data;
  return <div className="space-y-5"><PageHeader title={ticket.subject} subtitle="Customer support conversation" actions={<Link href="/admin/support"><AdminButton variant="outline">Back to tickets</AdminButton></Link>} />
    <DetailLayout main={<>
      <AdminCard className="p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Messages</h2><StatusBadge value={ticket.status} /></div>
        {ticket.messages.length ? <ol className="mt-4 space-y-4">{ticket.messages.map((message) => <li key={message.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"><p className="whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-2 text-xs text-zinc-500">{message.authorId === ticket.user.id ? ticket.user.email : "Admin"} · <RelativeTime value={message.createdAt} /></p></li>)}</ol> : <div className="mt-4"><AdminEmptyState title="No messages yet" description="Send a reply to start the conversation." /></div>}
      </AdminCard>
      <AdminCard className="p-4"><h2 className="mb-3 font-semibold">Reply</h2><SupportReplyForm ticketId={ticket.id} status={ticket.status} /></AdminCard>
    </>} side={<MetaCard title="Customer"><p className="font-medium">{ticket.user.name || "Customer"}</p><p>{ticket.user.email}</p><p>{ticket.user.phone}</p><p>Ticket {ticket.id.slice(-8)}</p></MetaCard>} />
  </div>;
}

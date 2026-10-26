import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailLayout, MetaCard } from "@/components/admin/ui/detail";
import { Money, PageHeader, StatusBadge } from "@/components/admin/ui/primitives";
import { loadAdminPayment } from "@/lib/admin/money";
import { formatDate } from "@/lib/utils";
import { PaymentDetailActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentPage({ params }: { params: { id: string } }) {
  const payment = await loadAdminPayment(params.id);
  if (!payment.ok) notFound();
  const row = payment.data;
  return (
    <div>
      <PageHeader title={row.invoiceNumber || "Payment"} subtitle={row.plan || row.provider} actions={<Link className="text-sm underline" href="/admin/payments">All payments</Link>} />
      <DetailLayout
        main={
          <div className="space-y-4">
            <div className="text-3xl font-semibold tabular-nums"><Money paise={row.amount} /></div>
            <StatusBadge value={row.status} />
            <PaymentDetailActions id={row.id} status={row.status} provider={row.provider} />
          </div>
        }
        side={
          <MetaCard title="Details">
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Customer</span><Link className="underline" href={`/admin/customers/${row.user.id}`}>{row.user.email}</Link></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Phone</span><span>{row.user.phone || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Gateway</span><span>{row.provider}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">UTR</span><span>{row.utr || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Refund UTR</span><span>{row.refundUtr || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Created</span><span>{formatDate(row.createdAt)}</span></div>
          </MetaCard>
        }
      />
    </div>
  );
}

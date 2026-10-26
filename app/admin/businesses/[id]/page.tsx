import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailLayout, MetaCard, Timeline } from "@/components/admin/ui/detail";
import { Money, PageHeader, StatusBadge } from "@/components/admin/ui/primitives";
import { loadAdminBusiness, loadAdminBusinessDesk } from "@/lib/admin/people";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { AdminBusinessForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage({ params }: { params: { id: string } }) {
  const [business, desk] = await Promise.all([loadAdminBusiness(params.id), loadAdminBusinessDesk(params.id)]);
  if (!business.ok || !desk.ok) notFound();
  const row = business.data;
  return (
    <div>
      <PageHeader
        title={row.name}
        subtitle={`/r/${row.slug}`}
        actions={<a className="text-sm underline" href={absoluteUrl(`/r/${row.slug}`)}>Tap page</a>}
      />
      <DetailLayout
        main={
          <>
            <AdminBusinessForm
              id={row.id}
              name={row.name}
              ownerEmail={row.owner.email || ""}
              isActive={row.isActive}
              reviewGating={desk.data.reviewGating}
              ratingThreshold={desk.data.ratingThreshold}
            />
            <section>
              <h2 className="mb-2 text-sm font-semibold">QR codes</h2>
              <ul className="space-y-1 text-sm">
                {desk.data.qrs.length === 0 ? <li className="text-zinc-500">No codes on this business.</li> : null}
                {desk.data.qrs.map((code) => <li key={code.id}>{code.label} · {code.shortCode} · {code.scans} scans · {code.status}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Orders</h2>
              <ul className="space-y-1 text-sm">
                {desk.data.orders.length === 0 ? <li className="text-zinc-500">No shop orders.</li> : null}
                {desk.data.orders.map((order) => (
                  <li key={order.id} className="flex justify-between gap-3">
                    <Link className="underline" href="/admin/production">{order.invoiceNumber || order.id}</Link>
                    <span><StatusBadge value={order.status} /> <Money paise={order.totalPaise} /></span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Reviews</h2>
              <ul className="space-y-1 text-sm">
                {desk.data.reviews.length === 0 ? <li className="text-zinc-500">No reviews yet.</li> : null}
                {desk.data.reviews.map((review) => <li key={review.id}>{review.rating} stars · {formatDate(review.createdAt)}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Activity</h2>
              <Timeline items={row.timeline} />
            </section>
          </>
        }
        side={
          <MetaCard title="Details">
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Owner</span><Link className="underline" href={`/admin/customers/${row.owner.id}`}>{row.owner.email}</Link></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">City</span><span>{row.city || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Phone</span><span>{row.phone || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Status</span><StatusBadge value={row.isActive ? "ACTIVE" : "PAUSED"} /></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Opened</span><span>{formatDate(row.createdAt)}</span></div>
          </MetaCard>
        }
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailLayout, MetaCard, Timeline } from "@/components/admin/ui/detail";
import { Money, PageHeader, StatusBadge } from "@/components/admin/ui/primitives";
import { listAdminPlans } from "@/lib/admin/plans-admin";
import { loadAdminUser, loadAdminUserEditor } from "@/lib/admin/people";
import { formatDate } from "@/lib/utils";
import { UserEditForm } from "../../users/[id]/user-edit";
import { CustomerActions } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomerPage({ params }: { params: { id: string } }) {
  const [user, editor, plans] = await Promise.all([loadAdminUser(params.id), loadAdminUserEditor(params.id), listAdminPlans()]);
  if (!user.ok || !editor.ok) notFound();
  const row = user.data;
  return (
    <div>
      <PageHeader
        title={row.name || row.email || "Owner"}
        subtitle={row.email || undefined}
        actions={<Link className="text-sm text-zinc-500 underline" href="/admin/customers">All owners</Link>}
      />
      <DetailLayout
        main={
          <>
            <CustomerActions
              userId={row.id}
              suspended={row.suspended}
              plans={(plans.ok ? plans.data.items : []).map((plan) => ({ id: plan.id, name: plan.nameEn }))}
            />
            <section>
              <h2 className="mb-2 text-sm font-semibold">Businesses</h2>
              <ul className="space-y-2 text-sm">
                {row.businesses.length === 0 ? <li className="text-zinc-500">No businesses.</li> : null}
                {row.businesses.map((business) => (
                  <li key={business.id}><Link className="underline" href={`/admin/businesses/${business.id}`}>{business.name}</Link> <span className="text-zinc-500">/{business.slug}</span></li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Payments</h2>
              <ul className="space-y-2 text-sm">
                {row.payments.length === 0 ? <li className="text-zinc-500">No payments.</li> : null}
                {row.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-3">
                    <Link className="underline" href={`/admin/payments/${payment.id}`}>{payment.provider}</Link>
                    <span><Money paise={payment.amount} /> <StatusBadge value={payment.status} /></span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Devices</h2>
              <ul className="space-y-1 text-sm">
                {row.devices.length === 0 ? <li className="text-zinc-500">No devices.</li> : null}
                {row.devices.map((device) => <li key={device.id}>{device.shortCode} · {device.kind} · {device.status}</li>)}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Activity</h2>
              <Timeline items={row.timeline} />
            </section>
            <UserEditForm user={editor.data} />
          </>
        }
        side={
          <MetaCard title="Details">
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Role</span><span>{row.role}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Status</span><StatusBadge value={row.subscriptionStatus} /></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Plan</span><span>{row.subscription?.plan || row.tier}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Phone</span><span>{row.phone || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Ends</span><span>{row.subscriptionEndsAt ? formatDate(row.subscriptionEndsAt) : "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Joined</span><span>{formatDate(row.createdAt)}</span></div>
          </MetaCard>
        }
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { loadAdminOrderDetail } from "@/lib/admin/orders";
import { PageHeader, Money, StatusBadge } from "@/components/admin/ui/primitives";
import { AdminCard, AdminButton, AdminEmptyState } from "@/components/admin/ui/controls";
import { DetailLayout, MetaCard, Timeline } from "@/components/admin/ui/detail";
import { SHOP_ORDER_STATUSES, shopStatusLabel } from "@/lib/shop/order-status";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  await requireAdminPage();
  const { id } = await params;
  const result = await loadAdminOrderDetail(id);
  if (!result.ok) notFound();
  const order = result.data;
  return <div className="space-y-5">
    <PageHeader title={order.invoiceNumber || `Order ${order.id.slice(-8)}`} subtitle={order.business?.name || order.buyerLegalName || "QR24x7"} actions={<Link href="/admin/orders"><AdminButton variant="outline">Back to orders</AdminButton></Link>} />
    <DetailLayout main={<>
      <AdminCard className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm text-zinc-500">Order total</div><div className="mt-1 text-2xl font-semibold"><Money paise={order.totalPaise} /></div></div><StatusBadge value={order.status} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div>Payment: {order.paymentStatus}</div><div>Placed: {new Date(order.createdAt).toLocaleString("en-IN")}</div><div>Subtotal: <Money paise={order.subtotalPaise} /></div><div>Balance: <Money paise={order.balancePaise} /></div></div></AdminCard>
      <AdminCard className="p-4"><h2 className="font-semibold">Items and proofs</h2>{order.lines.length ? <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">{order.lines.map((line) => <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={line.id}><div><div className="font-medium">{line.name}</div><div className="text-zinc-500">{line.sku || "No SKU"} · Qty {line.qty} · <Money paise={line.unitPaise} /></div></div>{line.hasProof && <a className="text-emerald-700 underline dark:text-emerald-300" target="_blank" rel="noreferrer" href={`/api/admin/shop/orders/${order.id}/proof?line=${line.id}`}>Open proof</a>}</li>)}</ul> : <AdminEmptyState title="No line items" description="This order has no catalogue lines." />}</AdminCard>
      <AdminCard className="p-4"><h2 className="font-semibold">Tracking</h2>{order.shipment ? <div className="mt-3 space-y-1 text-sm"><p>{order.shipment.courierName || order.shipment.provider} · {order.shipment.awb || "AWB pending"}</p>{order.shipment.lastError ? <p className="text-amber-700">{order.shipment.lastError}</p> : null}</div> : <p className="mt-2 text-sm text-zinc-500">No shipment has been created.</p>}<div className="mt-4"><Link href="/admin/orders?tab=shipping"><AdminButton variant="outline">Manage shipping</AdminButton></Link></div></AdminCard>
      <AdminCard className="p-4"><h2 className="font-semibold">Status history</h2><div className="mt-4"><Timeline items={order.timeline.map((item) => ({ id: item.id, action: `${item.from ? shopStatusLabel(item.from as never) : "Order created"} → ${item.to ? shopStatusLabel(item.to as never) : order.status}`, createdAt: item.createdAt, reason: item.comment || undefined }))} /></div></AdminCard>
    </>} side={<><MetaCard title="Customer"><p className="font-medium">{order.customer.name || "Customer"}</p><p>{order.customer.email}</p><p>{order.customer.phone}</p></MetaCard><MetaCard title="Order status"><p>Current: {shopStatusLabel(order.status)}</p><p>{order.pendingReprint ? "Reprint requested" : "No pending reprint"}</p><p>{order.lines.some((line) => line.needsNfc) ? "Includes NFC" : "No NFC items"}</p><p>{order.lines.some((line) => line.ships) ? "Shipping required" : "No shipping required"}</p></MetaCard><MetaCard title="Actions"><p>Use the order board to move this order through an allowed transition. Every status change records the previous and new status in the audit trail.</p><Link href="/admin/orders?view=board"><AdminButton className="mt-2 w-full">Open order board</AdminButton></Link></MetaCard></>} />
  </div>;
}

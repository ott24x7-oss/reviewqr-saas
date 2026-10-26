import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { getShippingConfig } from "@/lib/settings";
import { adminCarrierState } from "@/lib/shop/shipping";
import { listAdminOrderPipeline } from "@/lib/admin/orders";
import { PageHeader, StatusBadge } from "@/components/admin/ui/primitives";
import { AdminButton, AdminEmptyState, AdminInput, AdminSelect } from "@/components/admin/ui/controls";
import { ProductionBoard, type ProductionCard } from "@/components/admin/production-board";
import { OrdersTable } from "./orders-table";
import { SHOP_ORDER_STATUSES } from "@/lib/shop/order-status";
import ReportsPage from "../shop/reports/page";
import ShippingPage from "../shipping/page";
import NfcQueuePage from "../production/nfc/page";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : "orders";
  if (tab === "reports") return <>{await ReportsPage()}</>;
  if (tab === "shipping") return <>{await ShippingPage()}</>;
  if (tab === "nfc") return <>{await NfcQueuePage()}</>;
  const search = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => typeof v === "string" ? [[k, v]] : Array.isArray(v) ? v.map((item) => [k, item]) : []));
  const result = await listAdminOrderPipeline(search);
  if (!result.ok) throw new Error(result.error);
  const { items, total, page, pageSize } = result.data;
  const view = search.get("view") === "table" ? "table" : "board";
  const carrier = adminCarrierState(await getShippingConfig(), process.env.NODE_ENV);
  const cards: ProductionCard[] = items.map((item) => ({
    id: item.id, status: item.status, businessName: item.businessName, anyLineNeedsNfc: item.anyLineNeedsNfc,
    ships: item.ships, awb: item.awb, lastError: item.lastError, pendingReprint: item.pendingReprint,
    lines: item.lines.map((line) => ({ id: line.id, name: line.name, hasProof: line.hasProof }))
  }));
  return <div className="space-y-5">
    <PageHeader title="Orders" subtitle={`${total.toLocaleString("en-IN")} paid orders · production, proofs, tracking and audit`} actions={<div className="flex gap-2"><Link href="/admin/orders?tab=reports"><AdminButton variant="outline">Reports</AdminButton></Link><Link href="/admin/orders?tab=shipping"><AdminButton variant="outline">Shipping</AdminButton></Link><Link href="/admin/orders?tab=nfc"><AdminButton variant="outline">NFC queue</AdminButton></Link></div>} />
    <div className="flex flex-wrap gap-2 rounded-[14px] border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900" aria-label="Order views">
      <Link href={`/admin/orders?${new URLSearchParams([...search.entries()].filter(([key]) => key !== "view").concat([["view", "board"]]))}`}><AdminButton variant={view === "board" ? "primary" : "outline"}>Board</AdminButton></Link>
      <Link href={`/admin/orders?${new URLSearchParams([...search.entries()].filter(([key]) => key !== "view").concat([["view", "table"]]))}`}><AdminButton variant={view === "table" ? "primary" : "outline"}>Table</AdminButton></Link>
      <form className="flex min-w-0 flex-1 flex-wrap gap-2" action="/admin/orders">
        <input type="hidden" name="view" value={view} />
        <AdminInput name="q" defaultValue={search.get("q") || ""} placeholder="Search orders, business, customer" aria-label="Search orders" className="min-h-10 w-60 max-w-full" />
        <AdminSelect name="status" defaultValue={search.get("status") || ""} aria-label="Filter by order status" className="w-48">
          <option value="">All statuses</option>{SHOP_ORDER_STATUSES.filter((status) => status !== "PENDING_PAYMENT").map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </AdminSelect>
        <AdminSelect name="pageSize" defaultValue={search.get("pageSize") || "20"} aria-label="Rows per page" className="w-32"><option>20</option><option>50</option><option>100</option></AdminSelect>
        <AdminButton type="submit" variant="outline">Apply filters</AdminButton>
      </form>
    </div>
    {!items.length ? <AdminEmptyState title="No orders yet" description="Paid orders will appear here with proofs, tracking, and production actions." /> : view === "table" ? <OrdersTable rows={items} total={total} page={page} pageSize={pageSize} /> : <ProductionBoard cards={cards} carrierState={carrier} />}
    {total > pageSize ? <div className="flex items-center justify-between text-sm text-zinc-500"><span>Page {page} · {items.length} of {total}</span><div className="flex gap-2">{page <= 1 ? <AdminButton variant="outline" disabled>Previous</AdminButton> : <Link href={`/admin/orders?${new URLSearchParams([...search.entries()].filter(([key]) => key !== "page").concat([["page", String(page - 1)]]))}`}><AdminButton variant="outline">Previous</AdminButton></Link>}{page * pageSize >= total ? <AdminButton variant="outline" disabled>Next</AdminButton> : <Link href={`/admin/orders?${new URLSearchParams([...search.entries()].filter(([key]) => key !== "page").concat([["page", String(page + 1)]]))}`}><AdminButton variant="outline">Next</AdminButton></Link>}</div></div> : null}
  </div>;
}

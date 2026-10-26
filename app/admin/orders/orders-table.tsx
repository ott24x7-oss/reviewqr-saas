"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { Money, RelativeTime, StatusBadge } from "@/components/admin/ui/primitives";

export type OrderRow = {
  id: string; status: string; totalPaise: number; invoiceNumber: string | null; createdAt: string;
  businessName: string; customerName: string; phone: string; pendingReprint: boolean;
};

export function OrdersTable({ rows, total, page, pageSize }: { rows: OrderRow[]; total: number; page: number; pageSize: number }) {
  const columns: ColumnDef<OrderRow, unknown>[] = [
    { accessorKey: "id", header: "Order", meta: { sort: "id" }, cell: ({ row }) => <Link className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300" href={`/admin/orders/${row.original.id}`}>{row.original.invoiceNumber || row.original.id.slice(-8)}</Link> },
    { accessorKey: "businessName", header: "Business" },
    { accessorKey: "customerName", header: "Customer", cell: ({ row }) => <div>{row.original.customerName}<div className="text-xs text-zinc-500">{row.original.phone}</div></div> },
    { accessorKey: "status", header: "Status", meta: { sort: "status" }, cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: "totalPaise", header: "Total", meta: { sort: "totalPaise" }, cell: ({ row }) => <Money paise={row.original.totalPaise} /> },
    { accessorKey: "createdAt", header: "Placed", meta: { sort: "createdAt" }, cell: ({ row }) => <RelativeTime value={row.original.createdAt} /> },
    { id: "needsAttention", header: "", cell: ({ row }) => row.original.pendingReprint ? <span className="text-amber-700 dark:text-amber-300">Reprint requested</span> : null }
  ];
  return <DataTable tableId="admin-orders" columns={columns} rows={rows} total={total} page={page} pageSize={pageSize} getRowId={(row) => row.id} exportHref="/api/admin/shop/orders/export" empty="No orders match these filters." />;
}

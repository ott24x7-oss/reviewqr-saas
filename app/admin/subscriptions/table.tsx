"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { Money, RelativeTime, StatusBadge } from "@/components/admin/ui/primitives";

export type SubscriptionRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string;
  plan: string | null;
  status: string;
  endsAt: string | null;
  pricePaise: number;
};

const columns: ColumnDef<SubscriptionRow, unknown>[] = [
  {
    accessorKey: "email",
    header: "Customer",
    cell: ({ row }) => <Link className="hover:underline" href={`/admin/customers/${row.original.userId}`}>{row.original.name || row.original.email}</Link>
  },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "endsAt", header: "Ends", meta: { sort: "endsAt" }, cell: ({ getValue }) => <RelativeTime value={getValue() ? String(getValue()) : null} /> },
  { accessorKey: "pricePaise", header: "Price", cell: ({ getValue }) => <Money paise={Number(getValue())} /> }
];

export function SubscriptionsTable({ rows, total, page, pageSize }: { rows: SubscriptionRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="subscriptions"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      views={[
        { id: "all", label: "All", query: "/admin/subscriptions" },
        { id: "active", label: "Active", query: "/admin/subscriptions?status=ACTIVE" },
        { id: "trial", label: "Trial", query: "/admin/subscriptions?status=TRIALING" },
        { id: "expiring", label: "Expiring", query: "/admin/subscriptions?view=expiring" },
        { id: "churned", label: "Churned", query: "/admin/subscriptions?status=CANCELED" }
      ]}
      exportHref="/api/admin/export?entity=subscriptions"
    />
  );
}

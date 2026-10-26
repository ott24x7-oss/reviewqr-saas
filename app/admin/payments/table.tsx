"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { Money, StatusBadge } from "@/components/admin/ui/primitives";
import { PaymentActions } from "./payment-actions";

export type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  provider: string;
  createdAt: string;
  email: string | null;
  phone: string;
  plan: string | null;
  invoiceNumber: string | null;
};

const columns: ColumnDef<PaymentRow, unknown>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }) => <Link className="font-medium hover:underline" href={`/admin/payments/${row.original.id}`}>{row.original.invoiceNumber || row.original.id.slice(0, 8)}</Link>
  },
  { accessorKey: "email", header: "Customer" },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "provider", header: "Gateway" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "amount", header: "Amount", meta: { sort: "amount" }, cell: ({ getValue }) => <Money paise={Number(getValue())} /> },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <PaymentActions id={row.original.id} status={row.original.status} provider={row.original.provider} />
  }
];

export function PaymentsTable({ rows, total, page, pageSize }: { rows: PaymentRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="payments"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      views={[
        { id: "all", label: "All", query: "/admin/payments" },
        { id: "pending", label: "Pending", query: "/admin/payments?status=PENDING" },
        { id: "paid", label: "Completed", query: "/admin/payments?status=COMPLETED" },
        { id: "failed", label: "Failed", query: "/admin/payments?status=FAILED" }
      ]}
      exportHref="/api/admin/export?entity=payments"
    />
  );
}

"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { StatusBadge } from "@/components/admin/ui/primitives";

export type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: string;
  tier: string;
  status: string;
  businesses: number;
  payments: number;
};

const columns: ColumnDef<CustomerRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { sort: "name" },
    cell: ({ row }) => <Link className="font-medium underline-offset-2 hover:underline" href={`/admin/customers/${row.original.id}`}>{row.original.name || row.original.email || "Owner"}</Link>
  },
  { accessorKey: "email", header: "Email", meta: { sort: "email" } },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "tier", header: "Plan" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "businesses", header: "Businesses" },
  { accessorKey: "payments", header: "Payments" }
];

export function CustomersTable({ rows, total, page, pageSize }: { rows: CustomerRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="customers"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      views={[
        { id: "all", label: "All", query: "/admin/customers" },
        { id: "owners", label: "Owners", query: "/admin/customers?role=USER" },
        { id: "agents", label: "Agents", query: "/admin/customers?role=AGENT" },
        { id: "admins", label: "Admins", query: "/admin/customers?role=ADMIN" }
      ]}
      exportHref="/api/admin/export?entity=customers"
    />
  );
}

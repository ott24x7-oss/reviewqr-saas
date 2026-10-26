"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { StatusBadge } from "@/components/admin/ui/primitives";

export type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string;
  isActive: boolean;
  ownerId: string;
  ownerEmail: string | null;
  reviews: number;
  qrs: number;
};

const columns: ColumnDef<BusinessRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Business",
    meta: { sort: "name" },
    cell: ({ row }) => (
      <div>
        <Link className="font-medium hover:underline" href={`/admin/businesses/${row.original.id}`}>{row.original.name}</Link>
        <div className="text-xs text-zinc-500">/r/{row.original.slug}</div>
      </div>
    )
  },
  { accessorKey: "city", header: "City" },
  { accessorKey: "phone", header: "Phone" },
  {
    id: "owner",
    header: "Owner",
    cell: ({ row }) => <Link className="hover:underline" href={`/admin/customers/${row.original.ownerId}`}>{row.original.ownerEmail}</Link>
  },
  { accessorKey: "reviews", header: "Reviews" },
  { accessorKey: "qrs", header: "QR codes" },
  {
    id: "active",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.isActive ? "ACTIVE" : "PAUSED"} />
  }
];

export function BusinessesTable({ rows, total, page, pageSize }: { rows: BusinessRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="businesses"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      views={[
        { id: "open", label: "Open", query: "/admin/businesses" },
        { id: "archived", label: "Archived", query: "/admin/businesses?archived=1" },
        { id: "inactive", label: "Inactive", query: "/admin/businesses?active=0" }
      ]}
      exportHref="/api/admin/export?entity=businesses"
    />
  );
}

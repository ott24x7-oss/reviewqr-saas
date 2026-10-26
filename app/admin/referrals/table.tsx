"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { RelativeTime, StatusBadge } from "@/components/admin/ui/primitives";

export type ReferralRow = {
  id: string;
  referrerId: string;
  referrerEmail: string | null;
  referrerPhone: string;
  referredId: string;
  referredEmail: string | null;
  referredPhone: string;
  months: number;
  bonusDays: number;
  status: string;
  holdUntil: string;
};

const columns: ColumnDef<ReferralRow, unknown>[] = [
  { id: "referrer", header: "Referrer", cell: ({ row }) => <Link className="hover:underline" href={`/admin/customers/${row.original.referrerId}`}>{row.original.referrerEmail}</Link> },
  { accessorKey: "referrerPhone", header: "Referrer phone" },
  { id: "referred", header: "Referred", cell: ({ row }) => <Link className="hover:underline" href={`/admin/customers/${row.original.referredId}`}>{row.original.referredEmail}</Link> },
  { accessorKey: "referredPhone", header: "Referred phone" },
  { accessorKey: "months", header: "Months" },
  { accessorKey: "bonusDays", header: "Bonus days" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={String(getValue())} /> },
  { accessorKey: "holdUntil", header: "Hold", meta: { sort: "holdUntil" }, cell: ({ getValue }) => <RelativeTime value={String(getValue())} /> }
];

export function ReferralsTable({ rows, total, page, pageSize }: { rows: ReferralRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="referrals"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      views={[
        { id: "all", label: "All", query: "/admin/referrals" },
        { id: "pending", label: "Pending", query: "/admin/referrals?status=PENDING" },
        { id: "applied", label: "Applied", query: "/admin/referrals?status=APPLIED" }
      ]}
      exportHref="/api/admin/export?entity=referrals"
    />
  );
}

"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { Money } from "@/components/admin/ui/primitives";
import { PayButton } from "./pay-button";

export type CommissionRow = {
  agentId: string;
  profileId: string;
  name: string;
  phone: string;
  email: string | null;
  code: string;
  salesPaise: number;
  salesCount: number;
  pendingPaise: number;
  approvedPaise: number;
  paidPaise: number;
  legacyPaise: number;
};

const columns: ColumnDef<CommissionRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => (
      <div>
        <Link className="font-medium hover:underline" href={`/admin/agents/${row.original.profileId}`}>{row.original.name}</Link>
        <div className="text-xs text-zinc-500">{row.original.phone || row.original.email} · {row.original.code}</div>
      </div>
    )
  },
  { accessorKey: "salesPaise", header: "Sales", cell: ({ row }) => <span>{<Money paise={row.original.salesPaise} />}<span className="block text-xs text-zinc-500">{row.original.salesCount} payments</span></span> },
  { accessorKey: "pendingPaise", header: "Pending", cell: ({ getValue }) => <Money paise={Number(getValue())} /> },
  { accessorKey: "approvedPaise", header: "Approved", cell: ({ getValue }) => <Money paise={Number(getValue())} /> },
  { accessorKey: "paidPaise", header: "Paid", cell: ({ getValue }) => <Money paise={Number(getValue())} /> },
  { accessorKey: "legacyPaise", header: "Unsettled history", cell: ({ getValue }) => <Money paise={Number(getValue())} /> },
  { id: "payout", header: "Payout", cell: ({ row }) => <PayButton agentId={row.original.agentId} disabled={row.original.approvedPaise <= 0} /> }
];

export function CommissionsTable({ rows, total, page, pageSize }: { rows: CommissionRow[]; total: number; page: number; pageSize: number }) {
  return (
    <DataTable
      tableId="commissions"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.agentId}
      exportHref="/api/admin/export?entity=commissions"
    />
  );
}

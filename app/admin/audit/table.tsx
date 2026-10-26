"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/ui/data-table";
import { Drawer } from "@/components/admin/ui/detail";
import { RelativeTime } from "@/components/admin/ui/primitives";

export type AuditRow = {
  id: string;
  createdAt: string;
  adminName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  reason: string | null;
  ip: string | null;
  before: unknown;
  after: unknown;
};

export function AuditTable({ rows, total, page, pageSize }: { rows: AuditRow[]; total: number; page: number; pageSize: number }) {
  const [open, setOpen] = React.useState<AuditRow | null>(null);
  const columns: ColumnDef<AuditRow, unknown>[] = [
    { accessorKey: "createdAt", header: "When", meta: { sort: "createdAt" }, cell: ({ getValue }) => <RelativeTime value={String(getValue())} /> },
    { accessorKey: "adminName", header: "Admin" },
    { accessorKey: "action", header: "Action" },
    { accessorKey: "entity", header: "Target", cell: ({ row }) => <span>{row.original.entity || "—"} {row.original.entityId || ""}</span> },
    { accessorKey: "reason", header: "Reason" },
    {
      id: "diff",
      header: "",
      cell: ({ row }) => (
        <button type="button" className="text-sm underline" onClick={() => setOpen(row.original)}>
          Diff
        </button>
      )
    }
  ];
  return (
    <>
      <DataTable
        tableId="audit"
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        getRowId={(row) => row.id}
        exportHref="/api/admin/export?entity=audit"
      />
      <Drawer open={!!open} title={open?.action || "Change"} onClose={() => setOpen(null)}>
        <pre className="overflow-x-auto text-xs">{JSON.stringify({ before: open?.before, after: open?.after, ip: open?.ip, reason: open?.reason }, null, 2)}</pre>
      </Drawer>
    </>
  );
}

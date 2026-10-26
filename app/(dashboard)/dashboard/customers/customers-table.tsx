"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/app-ui/data-table";
import { Money, RelativeTime } from "@/components/app-ui/primitives";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";
import type { CustomerRow } from "@/lib/store/customer-list";
import { CustomerTags } from "./customer-tags";

export function CustomersTable({ rows, total, pageIndex, pageSize, query, sort, direction }: { rows: CustomerRow[]; total: number; pageIndex: number; pageSize: number; query: string; sort: string; direction: "asc" | "desc" }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearch = useSearchParams();
  const { text } = useAppLanguage();
  const sorting: SortingState = [{ id: sort, desc: direction === "desc" }];
  const columns = React.useMemo<ColumnDef<CustomerRow, unknown>[]>(() => [
    { id: "name", accessorKey: "name", header: text("Customer", "ग्राहक"), cell: ({ row }) => <div><p className="font-medium">{row.original.name || text("No name", "नाम नहीं")}</p><p className="text-xs text-muted-foreground">{row.original.phone}</p></div>, enableSorting: true },
    { id: "business", accessorKey: "businessName", header: text("Business", "कारोबार"), enableSorting: true },
    { id: "orders", accessorKey: "orders", header: text("Orders", "ऑर्डर"), cell: ({ row }) => <span className="tabular-nums">{row.original.orders}</span>, enableSorting: true },
    { id: "spendPaise", accessorKey: "spendPaise", header: text("Total spend", "कुल खर्च"), cell: ({ row }) => <Money value={row.original.spendPaise / 100} />, enableSorting: true },
    { id: "lastOrderAt", accessorKey: "lastOrderAt", header: text("Last order", "आख़िरी ऑर्डर"), cell: ({ row }) => row.original.lastOrderAt ? <RelativeTime date={row.original.lastOrderAt} /> : <span className="text-muted-foreground">—</span>, enableSorting: true },
    { id: "tags", header: text("Tags", "टैग"), cell: ({ row }) => <CustomerTags id={row.original.id} tags={row.original.tags} canManage={row.original.canManage} />, enableSorting: false }
  ], [text]);

  function updateUrl(values: Record<string, string | null>) {
    const params = new URLSearchParams(currentSearch.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  const queryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (queryTimer.current) clearTimeout(queryTimer.current); }, []);
  return <DataTable
    columns={columns}
    data={rows}
    total={total}
    pageIndex={pageIndex}
    pageSize={pageSize}
    sorting={sorting}
    query={query}
    onQueryChange={(next) => {
      if (queryTimer.current) clearTimeout(queryTimer.current);
      queryTimer.current = setTimeout(() => updateUrl({ q: next.trim() || null, page: null }), 350);
    }}
    onPageChange={(next) => updateUrl({ page: String(next) })}
    onSortingChange={(next) => {
      const sortValue = next[0];
      updateUrl({ sort: sortValue?.id || null, dir: sortValue ? (sortValue.desc ? "desc" : "asc") : null, page: null });
    }}
    emptyTitle={<AppText en="No matching customers" hi="कोई मिलता-जुलता ग्राहक नहीं" />}
    mobileCard={(row) => <div className="space-y-3">
      <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{row.name || text("No name", "नाम नहीं")}</p><p className="text-sm text-muted-foreground">{row.phone}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs">{row.orders} {text("orders", "ऑर्डर")}</span></div>
      <p className="text-sm text-muted-foreground">{row.businessName} · <Money value={row.spendPaise / 100} /></p>
      <CustomerTags id={row.id} tags={row.tags} canManage={row.canManage} />
    </div>}
  />;
}

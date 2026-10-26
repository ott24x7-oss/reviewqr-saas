"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, InlineError, Skeleton } from "./primitives";
import { useAppLanguage } from "./i18n";

export function DataTable<T>({
  columns,
  data,
  total,
  pageIndex,
  pageSize,
  onPageChange,
  sorting = [],
  onSortingChange,
  query = "",
  onQueryChange,
  filters,
  loading = false,
  error,
  onRetry,
  emptyTitle,
  mobileCard
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  filters?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: React.ReactNode;
  mobileCard?: (row: T) => React.ReactNode;
}) {
  const { text } = useAppLanguage();
  const pagination: PaginationState = { pageIndex, pageSize };
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    state: { pagination, sorting },
    onPaginationChange: (update) => {
      const next = typeof update === "function" ? update(pagination) : update;
      onPageChange(next.pageIndex);
    },
    onSortingChange: (update) => {
      const next = typeof update === "function" ? update(sorting) : update;
      onSortingChange?.(next);
    }
  });

  return (
    <section className="app-ui-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {onQueryChange ? (
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="app-ui-focus h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={text("Search", "खोजें")}
              aria-label={text("Search this list", "इस सूची में खोजें")}
            />
          </label>
        ) : <span />}
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>
      {error ? <div className="p-4"><InlineError title={error} onRetry={onRetry} /></div> : null}
      {loading ? (
        <div className="space-y-3 p-4" aria-label={text("Loading list", "सूची लोड हो रही है")}>
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      ) : !error && data.length === 0 ? (
        <EmptyState title={emptyTitle || text("No results yet", "अभी कोई परिणाम नहीं")} />
      ) : !error ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs font-medium text-muted-foreground">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      return (
                        <th key={header.id} className="whitespace-nowrap border-b px-4 py-3">
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button type="button" className="app-ui-focus inline-flex items-center gap-1 rounded-sm" onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : sorted === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />}
                            </button>
                          ) : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/35">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mobileCard ? (
            <div className="divide-y md:hidden">
              {table.getRowModel().rows.map((row) => <div key={row.id} className="p-3">{mobileCard(row.original)}</div>)}
            </div>
          ) : (
            <div className="divide-y md:hidden">
              {table.getRowModel().rows.map((row) => (
                <div className="space-y-2 p-3" key={row.id}>
                  {row.getVisibleCells().slice(0, 4).map((cell) => (
                    <div className="flex justify-between gap-3 text-sm" key={cell.id}>
                      <span className="text-muted-foreground">{cell.column.id}</span>
                      <span className="text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">{total === 0 ? "0" : pageIndex * pageSize + 1}–{Math.min(total, (pageIndex + 1) * pageSize)} {text("of", "में से")} {total}</span>
        <div className="flex gap-2">
          <button type="button" className={cn("app-ui-focus min-h-9 rounded-md border px-3", !table.getCanPreviousPage() && "opacity-50")} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{text("Previous", "पिछला")}</button>
          <button type="button" className={cn("app-ui-focus min-h-9 rounded-md border px-3", !table.getCanNextPage() && "opacity-50")} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{text("Next", "अगला")}</button>
        </div>
      </footer>
    </section>
  );
}

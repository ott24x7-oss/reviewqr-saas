"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type VisibilityState
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sort?: string;
  }
}

export type TableView = { id: string; label: string; query: string };

export function DataTable<T>({
  tableId,
  columns,
  rows,
  total,
  page,
  pageSize,
  getRowId,
  views = [],
  exportHref,
  bulkActions,
  onBulk,
  empty = "Nothing matches this view."
}: {
  tableId: string;
  columns: ColumnDef<T, unknown>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  getRowId: (row: T) => string;
  views?: TableView[];
  exportHref: string;
  bulkActions?: { id: string; label: string }[];
  onBulk?: (action: string, ids: string[]) => void;
  empty?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [density, setDensity] = React.useState<"comfortable" | "compact">("comfortable");
  const [visibility, setVisibility] = React.useState<VisibilityState>({});
  const [saved, setSaved] = React.useState<TableView[]>([]);

  React.useEffect(() => {
    const stored = localStorage.getItem(`admin-cols:${tableId}`);
    const dense = localStorage.getItem(`admin-density:${tableId}`);
    const viewsStored = localStorage.getItem(`admin-views:${tableId}`);
    if (stored) setVisibility(JSON.parse(stored) as VisibilityState);
    if (dense === "compact" || dense === "comfortable") setDensity(dense);
    if (viewsStored) setSaved(JSON.parse(viewsStored) as TableView[]);
  }, [tableId]);

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectColumn: ColumnDef<T, unknown> = {
    id: "select",
    enableHiding: false,
    header: () => (
      <input
        type="checkbox"
        aria-label="Select all rows on this page"
        checked={rows.length > 0 && rows.every((row) => selected.includes(getRowId(row)))}
        onChange={(event) => setSelected(event.target.checked ? rows.map(getRowId) : [])}
      />
    ),
    cell: ({ row }) => {
      const id = getRowId(row.original);
      return (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={selected.includes(id)}
          onChange={(event) => setSelected((current) => (event.target.checked ? [...current, id] : current.filter((item) => item !== id)))}
        />
      );
    }
  };

  const table = useReactTable({
    data: rows,
    columns: bulkActions?.length ? [selectColumn, ...columns] : columns,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(visibility) : updater;
      setVisibility(next);
      localStorage.setItem(`admin-cols:${tableId}`, JSON.stringify(next));
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row)
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const exportUrl = `${exportHref}${exportHref.includes("?") ? "&" : "?"}${new URLSearchParams(
    [...search.entries()].filter(([key]) => key !== "page")
  ).toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm hover:border-emerald-600 dark:border-zinc-700"
            onClick={() => router.push(view.query)}
          >
            {view.label}
          </button>
        ))}
        {saved.map((view) => (
          <button key={view.id} type="button" className="rounded-full border border-dashed px-3 py-1 text-sm" onClick={() => router.push(view.query)}>
            {view.label}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full px-3 py-1 text-sm text-emerald-700"
          onClick={() => {
            const label = window.prompt("Name this view");
            if (!label) return;
            const next = [...saved, { id: label, label, query: `${pathname}?${search.toString()}` }];
            setSaved(next);
            localStorage.setItem(`admin-views:${tableId}`, JSON.stringify(next));
          }}
        >
          Save view
        </button>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          push({ q: String(data.get("q") || ""), page: null });
        }}
      >
        <input
          name="q"
          defaultValue={search.get("q") || ""}
          aria-label="Filter this table"
          placeholder="Filter"
          className="h-9 w-56 rounded-[10px] border border-zinc-200 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="h-9 rounded-[10px] border px-3 text-sm">
          Apply
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 rounded-[10px] border px-3 text-sm"
            onClick={() => {
              const next = density === "compact" ? "comfortable" : "compact";
              setDensity(next);
              localStorage.setItem(`admin-density:${tableId}`, next);
            }}
          >
            {density === "compact" ? "Comfortable" : "Compact"}
          </button>
          <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => setColumnsOpen((value) => !value)}>
            Edit columns
          </button>
          <a className="inline-flex h-9 items-center rounded-[10px] border px-3 text-sm" href={exportUrl}>
            Export
          </a>
        </div>
      </form>
      {columnsOpen ? (
        <div className="flex flex-wrap gap-3 rounded-[10px] border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
            <label key={column.id} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
              />
              {column.id}
            </label>
          ))}
        </div>
      ) : null}
      {selected.length && bulkActions?.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-zinc-950 px-3 py-2 text-sm text-white">
          <span>{selected.length} selected</span>
          {bulkActions.map((action) => (
            <button key={action.id} type="button" className="rounded-md bg-white/10 px-2 py-1" onClick={() => onBulk?.(action.id, selected)}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sort = header.column.columnDef.meta?.sort;
                  const active = search.get("sort") === sort;
                  return (
                    <th key={header.id} className="px-3 py-2 font-medium">
                      {header.isPlaceholder ? null : sort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => push({ sort, dir: active && search.get("dir") !== "asc" ? "asc" : "desc", page: null })}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {active ? (search.get("dir") === "asc" ? "↑" : "↓") : ""}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-zinc-500" colSpan={table.getVisibleLeafColumns().length}>
                  {empty}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={density === "compact" ? "px-3 py-1.5" : "px-3 py-3"}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span className="tabular-nums">
          {from}–{to} of {total}
        </span>
        <div className="flex gap-2">
          <button type="button" className="rounded-[10px] border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => push({ page: String(page - 1) })}>
            Previous
          </button>
          <button
            type="button"
            className="rounded-[10px] border px-3 py-1 disabled:opacity-40"
            disabled={page * pageSize >= total}
            onClick={() => push({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

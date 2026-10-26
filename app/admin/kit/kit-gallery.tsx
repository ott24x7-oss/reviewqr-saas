"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CommandPalette } from "@/components/admin/ui/command-palette";
import { DataTable } from "@/components/admin/ui/data-table";
import { DetailLayout, Drawer, MetaCard, Timeline } from "@/components/admin/ui/detail";
import { ConfirmReason, StepUpDialog } from "@/components/admin/ui/dialogs";
import { Field, FormSection, StickySave, fieldClass } from "@/components/admin/ui/form-section";
import { FadeIn, Stagger } from "@/components/admin/ui/motion";
import { FunnelBars, MixDonut, RevenueChart } from "@/components/admin/ui/charts";
import { KpiCard, Money, PageHeader, RelativeTime, Skeleton, StatStrip, StatusBadge, TableSkeleton } from "@/components/admin/ui/primitives";

type Sample = { id: string; name: string; status: string; amount: number };

const rows: Sample[] = [
  { id: "1", name: "North Cafe", status: "ACTIVE", amount: 149900 },
  { id: "2", name: "Hill Store", status: "PENDING", amount: 49900 },
  { id: "3", name: "City Kitchen", status: "FAILED", amount: 0 }
];

const columns: ColumnDef<Sample, unknown>[] = [
  { accessorKey: "name", header: "Name", meta: { sort: "name" } },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ getValue }) => <Money paise={Number(getValue())} />
  }
];

export function KitGallery() {
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const [stepOpen, setStepOpen] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [search, setSearch] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState("");

  return (
    <FadeIn>
      <PageHeader
        title="Component kit"
        subtitle="Every admin primitive. This page is admin-only and not indexed."
        actions={
          <button type="button" className="h-9 rounded-[10px] bg-emerald-600 px-3 text-sm font-medium text-white" onClick={() => toast.success("Saved")}>
            Show toast
          </button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value="₹12,400" delta={8} series={[4, 6, 5, 8, 7, 9, 12]} />
        <KpiCard label="New paid" value="18" delta={-3} series={[2, 3, 3, 4, 2, 5, 4]} />
        <KpiCard label="Active subs" value="126" series={[10, 11, 11, 12, 12, 13, 14]} />
        <KpiCard label="Trials" value="9" delta={0} series={[1, 2, 2, 1, 3, 2, 2]} />
      </div>
      <StatStrip items={[{ label: "WhatsApp", value: "idle" }, { label: "Error rate", value: "0" }, { label: "Scans", value: "1,204" }, { label: "Orders", value: "16" }]} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-sm font-semibold">Revenue</h2>
          <RevenueChart days={["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]} revenue={[10000, 14000, 9000, 18000]} previous={[8000, 8000, 11000, 12000]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-2 text-sm font-semibold">Plan mix</h2>
            <MixDonut rows={[{ name: "Growth", count: 12 }, { name: "Starter", count: 7 }]} />
          </div>
          <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-2 text-sm font-semibold">Funnel</h2>
            <FunnelBars steps={[{ name: "Signups", value: 40 }, { name: "Paid", value: 12 }]} />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <DataTable
          tableId="kit"
          columns={columns}
          rows={rows}
          total={3}
          page={1}
          pageSize={20}
          getRowId={(row) => row.id}
          views={[{ id: "active", label: "Active", query: "/admin/_kit?status=ACTIVE" }]}
          exportHref="/api/admin/export?entity=customers"
          bulkActions={[{ id: "note", label: "Note" }]}
          onBulk={() => toast.message("Bulk action stays on this preview")}
        />
      </div>
      <div className="mt-8">
        <DetailLayout
          main={
            <div className="space-y-4">
              <h2 className="text-sm font-semibold">Timeline</h2>
              <Timeline items={[{ id: "a", action: "user.note", createdAt: new Date().toISOString(), reason: "Called the owner" }]} />
              <div className="flex flex-wrap gap-2">
                <StatusBadge value="ACTIVE" />
                <StatusBadge value="PENDING" />
                <StatusBadge value="REFUNDED" />
                <Money paise={25000000} compact />
                <RelativeTime value={new Date().toISOString()} />
              </div>
            </div>
          }
          side={
            <MetaCard title="Details">
              <div className="flex justify-between"><span className="text-zinc-500">Plan</span><span>Growth</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">City</span><span>Pune</span></div>
            </MetaCard>
          }
        />
      </div>
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          setDirty(false);
          setSaved("Saved in the preview only");
        }}
      >
        <FormSection title="Example section" description="Title on the left, fields on the right.">
          <Field label="Label">
            <input className={fieldClass} defaultValue={saved} onChange={() => setDirty(true)} />
          </Field>
        </FormSection>
        <StickySave dirty={dirty}>
          <button type="submit" className="h-9 rounded-[10px] bg-zinc-950 px-3 text-sm text-white dark:bg-white dark:text-zinc-950">
            Save
          </button>
        </StickySave>
      </form>
      <Stagger className="mt-6 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-16" />
        <TableSkeleton />
        <div className="flex flex-col gap-2">
          <button type="button" className="h-9 rounded-[10px] border text-sm" onClick={() => setReasonOpen(true)}>Reason dialog</button>
          <button type="button" className="h-9 rounded-[10px] border text-sm" onClick={() => setStepOpen(true)}>Step-up dialog</button>
          <button type="button" className="h-9 rounded-[10px] border text-sm" onClick={() => setDrawer(true)}>Drawer</button>
          <button type="button" className="h-9 rounded-[10px] border text-sm" onClick={() => setSearch(true)}>Command palette</button>
        </div>
      </Stagger>
      <p className="mt-6 text-sm text-zinc-500">Shortcuts: K opens search, / opens search, g then i opens Inbox, g then c opens Customers.</p>
      <ConfirmReason open={reasonOpen} title="Confirm with a reason" body="The reason is stored on the audit row." onClose={() => setReasonOpen(false)} onConfirm={async (reason) => {
        toast.success(reason);
      }} />
      <StepUpDialog open={stepOpen} title="Confirm payout" action="mark_payout_paid" onClose={() => setStepOpen(false)} onConfirmed={async () => {
        toast.success("Confirmed");
      }} />
      <Drawer
        open={drawer}
        title="Activity"
        onClose={() => setDrawer(false)}
        tabs={[
          { id: "notes", label: "Notes", body: <p className="text-sm text-zinc-500">Side drawer with the same surface as a detail page.</p> },
          { id: "audit", label: "Audit", body: <p className="text-sm text-zinc-500">Before and after stay on the audit row.</p> }
        ]}
      />
      <CommandPalette open={search} onOpenChange={setSearch} />
    </FadeIn>
  );
}

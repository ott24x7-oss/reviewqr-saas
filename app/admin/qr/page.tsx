import { requireAdminPage } from "@/lib/admin";
import { Button } from "@/components/admin/ui/controls";
import { StockBoard } from "./stock-board";
import { loadAdminQrStock } from "@/lib/admin/tools";

export const dynamic = "force-dynamic";

export default async function AdminQrPage({
  searchParams
}: {
  searchParams: { status?: string; q?: string };
}) {
  await requireAdminPage();
  const { status, q, codes, businesses, unassigned } = await loadAdminQrStock(searchParams);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display sm:text-3xl">QR stock</h1>
        <p className="text-sm text-muted-foreground">{unassigned} unassigned codes in stock. Assignment changes are written to the audit log.</p>
      </div>
      <form className="flex flex-wrap gap-2" action="/admin/qr">
        <input name="q" defaultValue={q} placeholder="Search code or label" className="input min-h-[44px]" aria-label="Search" />
        <select name="status" defaultValue={status} className="input min-h-[44px]" aria-label="Status">
          <option value="">All statuses</option>
          <option value="UNASSIGNED">Unassigned</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <Button type="submit" variant="outline" className="min-h-[44px]">Filter</Button>
      </form>
      <StockBoard
        businesses={businesses}
        codes={codes.map((code) => ({
          code: code.shortCode,
          label: code.label,
          status: code.status,
          scans: code.scans,
          businessId: code.businessId,
          businessName: code.business?.name || null
        }))}
      />
    </div>
  );
}

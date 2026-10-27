import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { commissionReportRows } from "@/lib/plans/payout";

function cell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const rows = await commissionReportRows();
  const header = ["name", "phone", "email", "code", "salesPaise", "salesCount", "pendingPaise", "approvedPaise", "paidPaise", "clawbackPaise"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [row.name, row.phone, row.email, row.code, row.salesPaise, row.salesCount, row.pendingPaise, row.approvedPaise, row.paidPaise, row.clawbackPaise]
        .map(cell)
        .join(",")
    )
  ];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=commissions.csv"
    }
  });
}

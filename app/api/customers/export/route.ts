import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { accountFeatureBlock, planDeniedResponse } from "@/lib/plans/feature-gate";
import { customersCsv } from "@/lib/store/customers";
import { loadCustomers } from "@/lib/store/customer-list";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await accountFeatureBlock(user.id, "customers");
  if (blocked) return planDeniedResponse(blocked);
  const rows = await loadCustomers(user.id, new Date(), undefined, "manage");
  const csv = customersCsv(rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    orders: row.orders,
    spendPaise: row.spendPaise,
    lastOrder: row.lastOrderLabel,
    tags: row.tags,
    inactive: row.inactive
  })));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"customers.csv\""
    }
  });
}

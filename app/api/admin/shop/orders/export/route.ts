import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { toCsv } from "@/lib/admin/csv";
import { exportAdminOrders } from "@/lib/admin/orders";
import { getClientIp } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const listed = await exportAdminOrders(req.nextUrl.searchParams);
  if (!listed.ok) return NextResponse.json({ error: listed.error }, { status: listed.status });
  const { items, filter, truncated } = listed.data;
  const csv = toCsv(
    ["order", "invoice", "status", "payment", "business", "customer", "email", "phone", "items", "totalPaise", "awb", "courier", "created"],
    items.map((row) => [
      row.id,
      row.invoiceNumber,
      row.status,
      row.paymentStatus,
      row.businessName,
      row.customerName,
      row.email,
      row.phone,
      row.items,
      row.totalPaise,
      row.awb,
      row.courierName,
      row.createdAt
    ])
  );
  await logAudit({
    userId: guard.user.id,
    action: "orders.export",
    entity: "Export",
    entityId: "orders",
    metadata: { filter, rows: items.length, truncated },
    ip: getClientIp(req.headers)
  });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="orders.csv"'
    }
  });
}

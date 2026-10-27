import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { listAdminAuditPage } from "@/lib/admin/audit-query";
import { toCsv } from "@/lib/admin/csv";
import { listAdminBusinesses, listAdminCustomers, listAdminReferrals, listAdminSubscriptions } from "@/lib/admin/directory";
import { listAdminPaymentsPage, pageCommissionReport } from "@/lib/admin/money";
import { getClientIp } from "@/lib/utils";

const ENTITIES = ["customers", "businesses", "payments", "subscriptions", "referrals", "commissions", "audit"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const search = req.nextUrl.searchParams;
  const entity = search.get("entity") || "";
  if (!ENTITIES.includes(entity as (typeof ENTITIES)[number])) {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }
  const built = await build(entity, search);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });
  await logAudit({
    userId: guard.user.id,
    action: "admin.export",
    entity: "Export",
    entityId: entity,
    metadata: { entity, rows: built.rows, truncated: built.truncated },
    ip: getClientIp(req.headers)
  });
  return new NextResponse(built.csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${entity}.csv"`
    }
  });
}

async function build(entity: string, search: URLSearchParams) {
  if (entity === "customers") {
    const listed = await listAdminCustomers(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["name", "email", "phone", "role", "tier", "status", "businesses", "payments", "created"],
      listed.data.items.map((row) => [row.name, row.email, row.phone, row.role, row.tier, row.status, row.businesses, row.payments, row.createdAt]),
      listed.data.truncated
    );
  }
  if (entity === "businesses") {
    const listed = await listAdminBusinesses(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["name", "slug", "city", "phone", "active", "owner", "reviews", "qrs", "created"],
      listed.data.items.map((row) => [row.name, row.slug, row.city, row.phone, row.isActive, row.ownerEmail, row.reviews, row.qrs, row.createdAt]),
      listed.data.truncated
    );
  }
  if (entity === "payments") {
    const listed = await listAdminPaymentsPage(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["invoice", "email", "phone", "plan", "status", "provider", "amountPaise", "utr", "created"],
      listed.data.items.map((row) => [row.invoiceNumber, row.email, row.phone, row.plan, row.status, row.provider, row.amount, row.utr, row.createdAt]),
      listed.data.truncated
    );
  }
  if (entity === "subscriptions") {
    const listed = await listAdminSubscriptions(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["email", "phone", "plan", "status", "ends", "pricePaise"],
      listed.data.items.map((row) => [row.email, row.phone, row.plan, row.status, row.endsAt, row.pricePaise]),
      listed.data.truncated
    );
  }
  if (entity === "referrals") {
    const listed = await listAdminReferrals(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["referrer", "referrerPhone", "referred", "referredPhone", "months", "bonusDays", "status", "holdUntil"],
      listed.data.items.map((row) => [row.referrerEmail, row.referrerPhone, row.referredEmail, row.referredPhone, row.months, row.bonusDays, row.status, row.holdUntil]),
      listed.data.truncated
    );
  }
  if (entity === "commissions") {
    const listed = await pageCommissionReport(search, "export");
    if (!listed.ok) return listed;
    return sheet(
      ["agent", "email", "phone", "code", "pendingPaise", "approvedPaise", "paidPaise", "clawbackPaise"],
      listed.data.items.map((row) => [row.name, row.email, row.phone, row.code, row.pendingPaise, row.approvedPaise, row.paidPaise, row.clawbackPaise]),
      listed.data.truncated
    );
  }
  const listed = await listAdminAuditPage(search, "export");
  if (!listed.ok) return listed;
  return sheet(
    ["when", "admin", "action", "entity", "entityId", "reason"],
    listed.data.items.map((row) => [row.createdAt, row.adminName, row.action, row.entity, row.entityId, row.reason]),
    listed.data.truncated
  );
}

function sheet(headers: string[], rows: Array<Array<unknown>>, truncated: boolean) {
  return { ok: true as const, csv: toCsv(headers, rows), rows: rows.length, truncated };
}

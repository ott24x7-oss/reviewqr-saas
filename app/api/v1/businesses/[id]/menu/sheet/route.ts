import { NextRequest, NextResponse } from "next/server";
import { requireV1User } from "@/lib/api/v1";
import { requireBusinessRole } from "@/lib/tenant";
import { denyFeatureResponse } from "@/lib/plans/feature-gate";
import { templateCsv } from "@/lib/store/entry";
import { csvForRows, demoRowsForBusiness, xlsxForRows, parseBulkFile } from "@/lib/store/bulk";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const business = await requireBusinessRole(auth.user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  const denied = await denyFeatureResponse(business.ownerId, "menu");
  if (denied) return denied;
  const search = req.nextUrl.searchParams;
  const format = search.get("format");
  const kind = search.get("kind") === "demo" ? "demo" : "template";
  const rows = kind === "demo" ? demoRowsForBusiness(business.industry) : [];
  if (format === "xlsx") return new NextResponse(await xlsxForRows(rows, kind === "template"), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="items-${kind}.xlsx"`
    }
  });
  return new NextResponse(kind === "demo" ? csvForRows(rows) : templateCsv(), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="items-${kind}.csv"` }
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const business = await requireBusinessRole(auth.user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  const denied = await denyFeatureResponse(business.ownerId, "menu");
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "VALIDATION", message: "Choose a CSV or Excel file" } }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: { code: "VALIDATION", message: "Choose a file under 2 MB" } }, { status: 400 });
  try {
    const rows = await parseBulkFile(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: { code: "VALIDATION", message: error instanceof Error ? error.message : "Could not read that file" } }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { PrintInputError } from "@/lib/print/design";
import { designFromBody, printExportSchema } from "@/lib/print/body";
import { exportPrint } from "@/lib/print/export";

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = printExportSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the print settings" }, { status: 400 });
  try {
    const data = parsed.data;
    const file = await exportPrint({
      design: designFromBody(data),
      preset: data.preset,
      sheetId: data.sheetId,
      format: data.format,
      codes: data.codes
    });
    const headers = new Headers({
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "private, no-store"
    });
    if (file.warning) headers.set("x-print-warning", file.warning);
    return new NextResponse(file.body, { headers });
  } catch (error) {
    if (error instanceof PrintInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { PrintInputError } from "@/lib/print/design";
import { designFromBody, printBatchSchema } from "@/lib/print/body";
import { sendPrintBatch } from "@/lib/print/respond";
import { createBlankBatch } from "@/lib/tap/print-batch";

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = printBatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the print settings" }, { status: 400 });
  try {
    const data = parsed.data;
    const made = await createBlankBatch({
      count: data.count,
      templateId: data.templateId,
      userId: admin.user.id
    });
    if (!made.ok) return NextResponse.json({ error: made.error }, { status: made.status });
    return sendPrintBatch({
      userId: admin.user.id,
      batchId: made.batchId,
      mode: "blank",
      templateId: data.templateId,
      design: designFromBody(data),
      preset: data.preset,
      sheetId: data.sheetId,
      format: data.format,
      codes: made.codes,
      ip: getClientIp(req.headers),
      userAgent: req.headers.get("user-agent") || undefined
    });
  } catch (error) {
    if (error instanceof PrintInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

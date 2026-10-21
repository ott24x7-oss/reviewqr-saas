import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { getClientIp } from "@/lib/utils";
import { PrintInputError } from "@/lib/print/design";
import { designFromBody, printBatchSchema } from "@/lib/print/body";
import { sendPrintBatch } from "@/lib/print/respond";
import { createTableBatch } from "@/lib/tap/print-batch";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = printBatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the print settings" }, { status: 400 });
  try {
    const data = parsed.data;
    const made = await createTableBatch({
      count: data.count,
      templateId: data.templateId,
      businessId: business.id,
      userId: user.id
    });
    if (!made.ok) return NextResponse.json({ error: made.error }, { status: made.status });
    return sendPrintBatch({
      userId: user.id,
      batchId: made.batchId,
      mode: "tables",
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

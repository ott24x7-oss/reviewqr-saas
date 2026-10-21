import { NextResponse } from "next/server";
import { logAudit } from "@/lib/admin";
import { PrintInputError } from "./design";
import { exportPrint } from "./export";
import type { PrintDesign, PrintFormat, PrintPreset } from "./design";

export async function sendPrintBatch(input: {
  userId: string;
  batchId: string;
  mode: "blank" | "tables" | "reprint";
  templateId: string;
  design: PrintDesign;
  preset: PrintPreset;
  sheetId?: string;
  format: PrintFormat;
  codes: { code: string; label: string }[];
  ip?: string;
  userAgent?: string;
}) {
  await logAudit({
    userId: input.userId,
    action: "print.batch",
    entity: "PrintBatch",
    entityId: input.batchId,
    metadata: {
      mode: input.mode,
      templateId: input.templateId,
      count: input.codes.length,
      codes: input.codes.map((item) => item.code)
    },
    ip: input.ip,
    userAgent: input.userAgent
  });
  try {
    const file = await exportPrint({
      design: input.design,
      preset: input.preset,
      sheetId: input.sheetId,
      format: input.format,
      codes: input.codes
    });
    const headers = new Headers({
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "private, no-store",
      "x-print-batch": input.batchId
    });
    if (file.warning) headers.set("x-print-warning", file.warning);
    return new NextResponse(file.body, { headers });
  } catch (error) {
    if (error instanceof PrintInputError) {
      return NextResponse.json(
        { error: error.message, batchId: input.batchId, codes: input.codes },
        { status: 400 }
      );
    }
    throw error;
  }
}

/**
 * Proofs and the imposed print file. Both run in the HTTP request.
 * The print.export job stays rejected so a worker never builds a PDF.
 */
import type { Prisma } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { shopDesignSchema } from "@reviewqr/shared";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { PrintInputError, type PrintDesign } from "@/lib/print/design";
import { exportPrint } from "@/lib/print/export";
import { queueAdminPush } from "@/lib/admin/push";
import { moveShopOrder } from "./order-move";

const PRINTABLE = ["APPROVED", "PRINTING", "NFC_WRITTEN", "PACKED", "PICKUP_SCHEDULED", "SHIPPED", "DELIVERED", "REPRINT"] as const;

function shopPrintDesign(templateId: string, name: string, showNfc: boolean): PrintDesign {
  return {
    templateId,
    name: name.trim() || "QR24x7",
    cta: "Scan to review",
    ctaHi: "",
    backLine: "",
    background: "#fff7ed",
    foreground: "#1c1917",
    qrDark: "#111111",
    qrLight: "#ffffff",
    module: "square",
    eye: "rounded",
    showNfc,
    showStars: true,
    rasters: []
  };
}

async function renderLine(design: PrintDesign, code: string, label: string, preset: "exact" | "sheet") {
  return exportPrint({
    design,
    preset,
    sheetId: preset === "sheet" ? "a4" : undefined,
    format: "pdf",
    codes: [{ code, label }]
  });
}

export async function sendShopProof(orderId: string, adminId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { lines: true, business: { select: { name: true } } }
  });
  if (!order) return fail(404, "Order not found");
  if (order.status !== "PAID" && order.status !== "CHANGES_REQUESTED") {
    return fail(400, "Send the proof from Paid or Changes requested");
  }

  const name = order.business?.name || order.buyerLegalName || "QR24x7";
  try {
    for (const line of order.lines) {
      if (!line.needsDesign) continue;
      const parsed = shopDesignSchema.safeParse(line.design);
      if (!parsed.success || !parsed.data.qrShortCode || !parsed.data.templateId) {
        return fail(400, "Choose a print template and a QR code before sending the proof");
      }
      const file = await renderLine(
        shopPrintDesign(parsed.data.templateId, parsed.data.headline || name, line.needsNfc),
        parsed.data.qrShortCode,
        line.name,
        "exact"
      );
      const url = ["data", "application/pdf;base64"].join(":") + "," + Buffer.from(file.body).toString("base64");
      await prisma.shopOrderLine.update({ where: { id: line.id }, data: { proofUrl: url } });
    }
  } catch (error) {
    const message = error instanceof PrintInputError ? error.message : "Could not build the proof";
    return fail(400, message);
  }

  const moved = await moveShopOrder({ orderId, to: "PROOF_SENT", actor: "admin", userId: adminId });
  if (moved.ok) {
    void queueAdminPush({
      event: "printProof",
      collapseKey: orderId,
      title: "Print proof waiting",
      body: "A shop proof is ready to review.",
      windowSeconds: 3600
    });
  }
  return moved;
}

export async function imposedShopPdf(orderIds: string[]) {
  const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  if (!ids.length) return fail(400, "Choose an order to print");
  const orders = await prisma.shopOrder.findMany({
    where: { id: { in: ids }, status: { in: [...PRINTABLE] } },
    include: { lines: true, business: { select: { name: true } } }
  });
  const groups = new Map<string, { design: PrintDesign; codes: Array<{ code: string; label: string }> }>();
  for (const order of orders) {
    const name = order.business?.name || order.buyerLegalName || "QR24x7";
    for (const line of order.lines) {
      if (!line.needsDesign) continue;
      const parsed = shopDesignSchema.safeParse(line.design);
      if (!parsed.success || !parsed.data.qrShortCode || !parsed.data.templateId) continue;
      const key = `${parsed.data.templateId}:${name}`;
      const group = groups.get(key) ?? {
        design: shopPrintDesign(parsed.data.templateId, parsed.data.headline || name, line.needsNfc),
        codes: []
      };
      group.codes.push({ code: parsed.data.qrShortCode, label: line.name });
      groups.set(key, group);
    }
  }
  if (!groups.size) return fail(400, "No approved design to print");

  const parts: Uint8Array[] = [];
  try {
    for (const group of groups.values()) {
      let file;
      try {
        file = await exportPrint({ design: group.design, preset: "sheet", sheetId: "a4", format: "pdf", codes: group.codes });
      } catch (error) {
        if (!(error instanceof PrintInputError)) throw error;
        file = await exportPrint({ design: group.design, preset: "exact", format: "pdf", codes: group.codes });
      }
      parts.push(file.body);
    }
  } catch (error) {
    const message = error instanceof PrintInputError ? error.message : "Could not build the print file";
    return fail(400, message);
  }

  const merged = await PDFDocument.create();
  for (const part of parts) {
    const doc = await PDFDocument.load(part);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return ok(Buffer.from(await merged.save()));
}

export async function nfcQueue(orderIds?: string[]) {
  const where: Prisma.ShopOrderWhereInput = orderIds?.length
    ? { id: { in: orderIds } }
    : { status: { in: ["PRINTING", "NFC_WRITTEN", "APPROVED"] } };
  const orders = await prisma.shopOrder.findMany({
    where,
    include: { lines: true, business: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const items = [];
  for (const order of orders) {
    for (const line of order.lines) {
      if (!line.needsNfc) continue;
      const parsed = shopDesignSchema.safeParse(line.design);
      const deviceId = parsed.success ? parsed.data.deviceId : null;
      if (!deviceId) continue;
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        select: { id: true, shortCode: true, chipUid: true, kind: true, status: true }
      });
      if (!device) continue;
      items.push({
        orderId: order.id,
        businessName: order.business?.name || order.buyerLegalName || "",
        lineName: line.name,
        device
      });
    }
  }
  return items;
}

export async function proofPdf(orderId: string, lineId: string) {
  const line = await prisma.shopOrderLine.findFirst({
    where: { id: lineId, orderId },
    select: { proofUrl: true }
  });
  if (!line?.proofUrl) return null;
  const match = line.proofUrl.match(/^data:application\/pdf;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

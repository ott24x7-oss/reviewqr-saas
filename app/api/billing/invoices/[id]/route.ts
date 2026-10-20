import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!payment || !payment.invoiceNumber) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (payment.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const draw = (text: string, size = 11, heavy = false) => {
    page.drawText(text, { x: 48, y, size, font: heavy ? bold : font, color: rgb(0.1, 0.1, 0.12) });
    y -= size + 8;
  };

  draw("Tax invoice", 20, true);
  draw(payment.invoiceNumber, 14, true);
  draw(`Issued ${payment.invoiceIssuedAt ? payment.invoiceIssuedAt.toISOString().slice(0, 10) : ""}`);
  y -= 8;
  draw("Seller", 12, true);
  draw(payment.invoiceSellerName || "ReviewQR");
  draw(payment.invoiceSellerGstin ? `GSTIN ${payment.invoiceSellerGstin}` : "GSTIN pending");
  if (payment.invoicePlaceOfSupply) draw(`Place of supply ${payment.invoicePlaceOfSupply}`);
  y -= 8;
  draw("Buyer", 12, true);
  draw(payment.invoiceBuyerName || "Customer");
  draw(payment.invoiceBuyerGstin ? `GSTIN ${payment.invoiceBuyerGstin}` : "GSTIN not provided");
  y -= 8;
  draw("Description", 12, true);
  draw(`ReviewQR ${payment.tier} plan, ${payment.periodMonths} month(s)`);
  draw("SAC 998314");
  draw(`Taxable value ${formatINR(payment.invoiceTaxablePaise || 0)}`);
  draw(`CGST ${formatINR(payment.invoiceCgstPaise || 0)}`);
  draw(`SGST ${formatINR(payment.invoiceSgstPaise || 0)}`);
  draw(`IGST ${formatINR(payment.invoiceIgstPaise || 0)}`);
  draw(`Total ${formatINR(payment.amount)}`, 13, true);
  if (payment.utr) draw(`UTR ${payment.utr}`);
  draw("This invoice is retained for tax records.");

  const bytes = await doc.save();
  return new NextResponse(new Blob([Buffer.from(bytes)]), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${payment.invoiceNumber}.pdf"`
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decodeDataProof, shopProofSignatureOk } from "@/lib/admin/shop-proof";

export const dynamic = "force-dynamic";

/** Serves one private shop proof. The signature expires after 10 minutes. */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order") || "";
  const lineId = req.nextUrl.searchParams.get("line") || "";
  if (!orderId || !lineId || !shopProofSignatureOk(orderId, lineId, req.nextUrl.searchParams.get("exp"), req.nextUrl.searchParams.get("sig"))) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "This proof link has expired" } }, { status: 401 });
  }
  const line = await prisma.shopOrderLine.findFirst({
    where: { id: lineId, orderId },
    select: { proofUrl: true }
  });
  const file = line?.proofUrl ? decodeDataProof(line.proofUrl) : null;
  if (!file || file.body.length === 0) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Proof not found" } }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=60",
      "x-content-type-options": "nosniff"
    }
  });
}

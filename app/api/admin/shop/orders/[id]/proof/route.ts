import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { proofPdf, sendShopProof } from "@/lib/shop/proof";

export const dynamic = "force-dynamic";

function pdfResponse(bytes: Buffer) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="proof.pdf"',
      "cache-control": "private, no-store"
    }
  });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const result = await sendShopProof(params.id, guard.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const line = req.nextUrl.searchParams.get("line") || "";
  const bytes = await proofPdf(params.id, line);
  if (!bytes) return NextResponse.json({ error: "Proof not found" }, { status: 404 });
  return pdfResponse(bytes);
}

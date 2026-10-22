import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { imposedShopPdf } from "@/lib/shop/proof";

export const dynamic = "force-dynamic";

const schema = z.object({
  ids: z.array(z.string().min(1).max(40)).max(50)
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose an order to print" }, { status: 400 });
  const result = await imposedShopPdf(parsed.data.ids);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="shop-print.pdf"',
      "cache-control": "private, no-store"
    }
  });
}

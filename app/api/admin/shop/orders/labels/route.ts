import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { queueShopLabels, shopLabelsText } from "@/lib/shop/ship-order";

export const dynamic = "force-dynamic";

const schema = z.object({
  ids: z.array(z.string().min(1).max(40)).max(50)
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose an order" }, { status: 400 });
  const queued = await queueShopLabels(parsed.data.ids);
  const text = await shopLabelsText(parsed.data.ids);
  if (!text) return NextResponse.json({ queued });
  if (queued > 0) return NextResponse.json({ queued, ready: true });
  return new NextResponse(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": 'attachment; filename="labels.txt"',
      "cache-control": "private, no-store"
    }
  });
}

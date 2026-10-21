import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { moveShopOrder } from "@/lib/shop/order-move";

export const dynamic = "force-dynamic";

const schema = z.object({
  to: z.string().min(1).max(40),
  comment: z.string().max(500).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the status" }, { status: 400 });
  const result = await moveShopOrder({
    orderId: params.id,
    to: parsed.data.to,
    actor: "admin",
    userId: guard.user.id,
    comment: parsed.data.comment
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

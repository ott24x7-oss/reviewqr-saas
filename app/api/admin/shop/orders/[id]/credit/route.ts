import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { issueShopCreditNote } from "@/lib/shop/credit-note";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().trim().min(1).max(500),
  amountPaise: z.number().int().positive().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Add a reason and a whole amount in paise" }, { status: 400 });
  const result = await issueShopCreditNote({
    orderId: params.id,
    userId: guard.user.id,
    reason: parsed.data.reason,
    amountPaise: parsed.data.amountPaise
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

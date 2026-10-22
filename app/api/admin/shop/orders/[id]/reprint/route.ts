import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { decideShopReprint } from "@/lib/shop/reprint";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject"])
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose approve or reject" }, { status: 400 });
  const result = await decideShopReprint({
    orderId: params.id,
    userId: guard.user.id,
    action: parsed.data.action
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

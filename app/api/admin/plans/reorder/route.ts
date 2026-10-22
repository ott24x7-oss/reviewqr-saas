import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { reorderPlans } from "@/lib/plans/admin-write";
import { getClientIp } from "@/lib/utils";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  try {
    await reorderPlans(parsed.data.ids);
  } catch {
    return NextResponse.json({ error: "Could not save the order" }, { status: 400 });
  }
  await logAudit({
    userId: guard.user.id,
    action: "plan.update",
    entity: "Plan",
    metadata: { op: "reorder" },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

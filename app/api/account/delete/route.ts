import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { eraseAccount } from "@/lib/account";
import { logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";

const schema = z.object({ confirm: z.literal("DELETE") });

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted here." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  await eraseAccount(user.id);
  await logAudit({
    userId: user.id,
    action: "account.delete",
    entity: "User",
    entityId: user.id,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

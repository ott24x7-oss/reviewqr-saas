import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { replyToTicket } from "@/lib/admin/support-admin";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = z
    .object({
      body: z.string().min(1).max(4000).optional(),
      status: z.enum(["OPEN", "CLOSED"]).optional()
    })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.body && !parsed.data.status)) {
    return NextResponse.json({ error: "Write a reply" }, { status: 400 });
  }

  const result = await replyToTicket({
    ticketId: params.id,
    authorId: guard.user.id,
    body: parsed.data.body,
    status: parsed.data.status
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "support.reply",
    entity: "SupportTicket",
    entityId: params.id,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

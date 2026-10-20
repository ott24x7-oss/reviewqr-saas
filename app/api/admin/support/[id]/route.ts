import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = z
    .object({
      body: z.string().min(1).max(4000).optional(),
      status: z.enum(["OPEN", "CLOSED"]).optional()
    })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.body && !parsed.data.status)) {
    return NextResponse.json({ error: "Write a reply" }, { status: 400 });
  }

  const body = parsed.data.body?.trim();
  await prisma.$transaction(async (tx) => {
    if (body) {
      await tx.supportMessage.create({
        data: { ticketId: ticket.id, authorId: guard.user.id, body }
      });
      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: "support_reply",
          title: "Support replied",
          message: body.slice(0, 240),
          link: "/dashboard/help"
        }
      });
    }
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { status: parsed.data.status || "OPEN" }
    });
  });

  await logAudit({
    userId: guard.user.id,
    action: "support.reply",
    entity: "SupportTicket",
    entityId: ticket.id,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

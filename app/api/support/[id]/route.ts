import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = z.object({ body: z.string().min(1).max(4000) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a message" }, { status: 400 });

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, body: parsed.data.body.trim() }
    }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } })
  ]);
  return NextResponse.json({ ok: true });
}

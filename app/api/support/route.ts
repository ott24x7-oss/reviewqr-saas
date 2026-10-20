import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimitDb } from "@/lib/rate-limit";

const createSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(3).max(4000)
});

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, email: true, role: true } } }
      }
    }
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimitDb({ key: `support:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many messages" }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid message" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject.trim(),
      messages: { create: { authorId: user.id, body: parsed.data.body.trim() } }
    }
  });
  return NextResponse.json({ id: ticket.id });
}

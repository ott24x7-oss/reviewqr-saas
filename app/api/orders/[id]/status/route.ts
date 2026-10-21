import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { loadOrderCards } from "@/lib/store/order-feed";
import { ORDER_STATUSES, canSetStatus, nextStatusEvents } from "@/lib/store/order-status";

const schema = z.object({
  status: z.enum(ORDER_STATUSES)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a status." }, { status: 400 });

  const order = await prisma.menuOrder.findUnique({
    where: { id: params.id },
    select: { id: true, businessId: true, status: true, events: true, createdAt: true }
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const manage = await requireBusinessRole(user.id, order.businessId, "manage");
  if (!manage) {
    const read = await requireBusinessRole(user.id, order.businessId, "read");
    if (read) {
      return NextResponse.json({ error: "You can view orders but not change them." }, { status: 403 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = parsed.data.status;
  if (order.status !== next) {
    if (!canSetStatus(order.status, next)) {
      return NextResponse.json(
        { error: "You can reject an order only while it is new or accepted." },
        { status: 400 }
      );
    }
    await prisma.menuOrder.update({
      where: { id: order.id },
      data: {
        status: next,
        events: nextStatusEvents(order.events, order.status, next, order.createdAt) as Prisma.InputJsonValue
      }
    });
  }

  const card = (await loadOrderCards(user.id, order.id))[0];
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order: card });
}

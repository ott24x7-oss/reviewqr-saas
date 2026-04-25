import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { businessSchema } from "@/lib/validations";

async function getBusinessForUser(id: string, userId: string) {
  return prisma.business.findFirst({
    where: { id, ownerId: userId, archived: false }
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await getBusinessForUser(params.id, user.id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ business });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await getBusinessForUser(params.id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = businessSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const business = await prisma.business.update({
    where: { id: existing.id },
    data: parsed.data as any
  });

  return NextResponse.json({ business });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await getBusinessForUser(params.id, user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.business.update({
    where: { id: existing.id },
    data: { archived: true, isActive: false }
  });
  return NextResponse.json({ ok: true });
}

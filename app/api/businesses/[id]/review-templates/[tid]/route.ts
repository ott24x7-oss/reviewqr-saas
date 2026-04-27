import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

async function ownedTemplate(businessId: string, tid: string, userId: string) {
  return prisma.reviewTemplate.findFirst({
    where: { id: tid, business: { id: businessId, ownerId: userId, archived: false } }
  });
}

const patchSchema = z.object({
  content: z.string().min(5).max(2000).optional(),
  used: z.boolean().optional()
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tpl = await ownedTemplate(params.id, params.tid, user.id);
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: any = {};
  if (typeof parsed.data.content === "string") data.content = parsed.data.content.trim();
  if (typeof parsed.data.used === "boolean") {
    data.used = parsed.data.used;
    data.usedAt = parsed.data.used ? new Date() : null;
  }

  const updated = await prisma.reviewTemplate.update({
    where: { id: tpl.id },
    data
  });
  return NextResponse.json({ ok: true, template: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tpl = await ownedTemplate(params.id, params.tid, user.id);
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reviewTemplate.delete({ where: { id: tpl.id } });
  return NextResponse.json({ ok: true });
}

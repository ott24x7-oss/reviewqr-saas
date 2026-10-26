import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { featureBlock, planDeniedResponse } from "@/lib/plans/feature-gate";
import { requireBusinessRole } from "@/lib/tenant";

async function managedTemplate(businessId: string, tid: string, userId: string) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return null;
  const blocked = await featureBlock(business.ownerId, "reviews-log");
  if (blocked) return { blocked } as const;
  return prisma.reviewTemplate.findFirst({
    where: { id: tid, businessId: business.id }
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
  const tpl = await managedTemplate(params.id, params.tid, user.id);
  if (tpl && "blocked" in tpl) return planDeniedResponse(tpl.blocked);
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
  const tpl = await managedTemplate(params.id, params.tid, user.id);
  if (tpl && "blocked" in tpl) return planDeniedResponse(tpl.blocked);
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reviewTemplate.delete({ where: { id: tpl.id } });
  return NextResponse.json({ ok: true });
}

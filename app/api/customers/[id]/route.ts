import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { denyFeatureResponse } from "@/lib/plans/feature-gate";
import { requireBusinessRole } from "@/lib/tenant";
import { parseTags } from "@/lib/store/customers";

const schema = z.object({
  tags: z.string().max(200)
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findUnique({ where: { id: params.id }, select: { id: true, businessId: true } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const manage = await requireBusinessRole(user.id, contact.businessId, "manage");
  if (!manage) {
    const read = await requireBusinessRole(user.id, contact.businessId, "read");
    if (read) return NextResponse.json({ error: "You can view customers but not change them." }, { status: 403 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const denied = await denyFeatureResponse(manage.ownerId, "customers");
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter tags separated by commas." }, { status: 400 });
  const tags = parseTags(parsed.data.tags);
  const saved = await prisma.contact.update({ where: { id: contact.id }, data: { tags }, select: { tags: true } });
  return NextResponse.json({ tags: saved.tags });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// Testimonial has only a scalar businessId (no relation), so we verify the
// owning business separately, then confirm the testimonial belongs to it.
async function getOwnedTestimonial(businessId: string, tid: string, userId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId, archived: false },
    select: { id: true }
  });
  if (!business) return null;
  const testimonial = await prisma.testimonial.findUnique({ where: { id: tid } });
  if (!testimonial || testimonial.businessId !== business.id) return null;
  return testimonial;
}

const patchSchema = z.object({
  isPublic: z.boolean().optional(),
  isApproved: z.boolean().optional()
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const testimonial = await getOwnedTestimonial(params.id, params.tid, user.id);
  if (!testimonial) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: any = {};
  if (typeof parsed.data.isPublic === "boolean") data.isPublic = parsed.data.isPublic;
  if (typeof parsed.data.isApproved === "boolean") data.isApproved = parsed.data.isApproved;

  const updated = await prisma.testimonial.update({
    where: { id: testimonial.id },
    data
  });
  return NextResponse.json({ ok: true, testimonial: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const testimonial = await getOwnedTestimonial(params.id, params.tid, user.id);
  if (!testimonial) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.testimonial.delete({ where: { id: testimonial.id } });
  return NextResponse.json({ ok: true });
}

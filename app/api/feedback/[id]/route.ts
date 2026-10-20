import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { z } from "zod";
import { requireBusinessRole } from "@/lib/tenant";

const patchSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"]).optional(),
  internalNote: z.string().max(1000).optional(),
  eraseContact: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feedback = await prisma.feedback.findFirst({ where: { id: params.id } });
  if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireBusinessRole(user.id, feedback.businessId, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.eraseContact) {
    await prisma.review.update({
      where: { id: feedback.reviewId },
      data: { customerName: null, customerEmail: null, customerPhone: null }
    });
    await logAudit({
      userId: user.id,
      action: "feedback.erase_contact",
      entity: "Review",
      entityId: feedback.reviewId,
      ip: getClientIp(req.headers)
    });
    if (!parsed.data.status && parsed.data.internalNote === undefined) {
      return NextResponse.json({ ok: true, erased: true });
    }
  }

  const updated = await prisma.feedback.update({
    where: { id: feedback.id },
    data: {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.internalNote !== undefined && { internalNote: parsed.data.internalNote }),
      ...(parsed.data.status === "RESOLVED" && {
        resolvedAt: new Date(),
        resolvedBy: user.id
      })
    }
  });

  return NextResponse.json({ feedback: updated });
}

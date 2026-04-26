import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { hashPassword, isStrongPassword } from "@/lib/auth";
import { getClientIp } from "@/lib/utils";

const patchSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["USER", "ADMIN", "AGENCY", "STAFF"]).optional(),
  subscriptionTier: z.enum(["FREE", "STARTER", "GROWTH", "AGENCY"]).optional(),
  subscriptionStatus: z
    .enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"])
    .optional(),
  trialEndsAt: z.string().nullable().optional(),
  subscriptionEndsAt: z.string().nullable().optional(),
  password: z.string().min(8).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const update: any = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.role) update.role = data.role;
  if (data.subscriptionTier) update.subscriptionTier = data.subscriptionTier;
  if (data.subscriptionStatus) update.subscriptionStatus = data.subscriptionStatus;
  if (data.trialEndsAt !== undefined) {
    update.trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null;
  }
  if (data.subscriptionEndsAt !== undefined) {
    update.subscriptionEndsAt = data.subscriptionEndsAt
      ? new Date(data.subscriptionEndsAt)
      : null;
  }
  if (data.password) {
    if (!isStrongPassword(data.password)) {
      return NextResponse.json(
        { error: "Password must be 8+ chars with an uppercase letter and a digit" },
        { status: 400 }
      );
    }
    update.password = await hashPassword(data.password);
  }

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: { role: true, subscriptionTier: true }
  });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const user = await prisma.user.update({ where: { id: params.id }, data: update });

  await logAudit({
    userId: guard.user.id,
    action: "user.update",
    entity: "user",
    entityId: params.id,
    metadata: { changedFields: Object.keys(update) },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });

  return NextResponse.json({ ok: true, userId: user.id });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  if (params.id === guard.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  await logAudit({
    userId: guard.user.id,
    action: "user.delete",
    entity: "user",
    entityId: params.id,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { hashPassword, isStrongPassword } from "@/lib/auth";
import { editUserSubscription } from "@/lib/plans/snapshot";
import { getClientIp } from "@/lib/utils";

const patchSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["USER", "ADMIN", "AGENCY", "STAFF", "AGENT"]).optional(),
  subscriptionTier: z.enum(["FREE", "STARTER", "GROWTH", "AGENCY"]).optional(),
  subscriptionStatus: z
    .enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"])
    .optional(),
  trialEndsAt: z.string().nullable().optional(),
  subscriptionEndsAt: z.string().nullable().optional(),
  password: z.string().min(8).optional(),
  reason: z.string().trim().max(500).optional()
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

  const auditSelect = {
    role: true,
    subscriptionTier: true,
    subscriptionStatus: true,
    subscriptionEndsAt: true,
    trialEndsAt: true
  } as const;
  const before = await prisma.user.findUnique({ where: { id: params.id }, select: auditSelect });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const subscriptionTouched =
    data.subscriptionTier != null ||
    data.subscriptionStatus != null ||
    data.subscriptionEndsAt !== undefined ||
    data.trialEndsAt !== undefined;
  const sameTime = (a: Date | null, b: string | null | undefined) =>
    (a ? a.toISOString().slice(0, 10) : null) === (b ? new Date(b).toISOString().slice(0, 10) : null);
  const roleChanged = !!data.role && data.role !== before.role;
  const subscriptionChanged =
    (data.subscriptionTier != null && data.subscriptionTier !== before.subscriptionTier) ||
    (data.subscriptionStatus != null && data.subscriptionStatus !== before.subscriptionStatus) ||
    (data.subscriptionEndsAt !== undefined && !sameTime(before.subscriptionEndsAt, data.subscriptionEndsAt)) ||
    (data.trialEndsAt !== undefined && !sameTime(before.trialEndsAt, data.trialEndsAt));
  const reason = data.reason || "";
  // A role change (for example to ADMIN) or a change of paid access needs a reason on the audit row.
  if ((roleChanged || subscriptionChanged) && !reason) {
    return NextResponse.json({ error: "A reason is required to change the role or subscription" }, { status: 400 });
  }
  if (params.id === guard.user.id && roleChanged) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: params.id }, data: update });
    if (subscriptionTouched) {
      const tier = (data.subscriptionTier ?? before.subscriptionTier) as SubscriptionTier;
      const status = (data.subscriptionStatus ?? before.subscriptionStatus) as SubscriptionStatus;
      const endsAt =
        data.subscriptionEndsAt !== undefined
          ? data.subscriptionEndsAt
            ? new Date(data.subscriptionEndsAt)
            : null
          : before.subscriptionEndsAt;
      await editUserSubscription(tx, { userId: params.id, tier, status, endsAt });
    }
    return updated;
  });

  const after = await prisma.user.findUnique({ where: { id: params.id }, select: auditSelect });
  await logAudit({
    userId: guard.user.id,
    action: roleChanged ? "user.role.change" : subscriptionChanged ? "user.tier.change" : "user.update",
    entity: "user",
    entityId: params.id,
    reason: reason || null,
    before,
    after,
    metadata: { changedFields: Object.keys(update).filter((key) => key !== "password"), passwordReset: !!data.password },
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

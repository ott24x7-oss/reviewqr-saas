import { NextRequest, NextResponse } from "next/server";
import type { PlanDuration, UserRole } from "@prisma/client";
import { z } from "zod";
import { logAudit, requireAdminApi, type AuditAction } from "@/lib/admin";
import {
  cancelAdminUser,
  changeAdminUserPlan,
  grantAdminDays,
  noteAdminUser,
  resendAdminLogin,
  resetAdminOnboarding,
  revealAdminUserPhone,
  setAdminUserRole,
  setAdminUserSuspended
} from "@/lib/admin/people";
import { readWebStepUp } from "@/lib/admin/web-step";
import { getClientIp } from "@/lib/utils";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("plan"), planId: z.string().min(1), duration: z.enum(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"]).optional(), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("grant"), days: z.number().int().positive().max(3650), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("unsuspend"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("reset-onboarding") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("role"), role: z.enum(["USER", "ADMIN", "AGENCY", "STAFF", "AGENT"]), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("reveal"), reason: z.string().trim().min(1).max(500) })
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form" }, { status: 400 });
  const body = parsed.data;
  const needsStep = body.action === "role" || (body.action === "grant" && body.days > 30);
  if (needsStep && !readWebStepUp(guard.user.id)) {
    return NextResponse.json({ error: "Enter the WhatsApp code to confirm this" }, { status: 403 });
  }
  const id = params.id;
  let action: AuditAction = "user.update";
  let result;
  if (body.action === "plan") {
    result = await changeAdminUserPlan(id, body.planId, body.duration as PlanDuration | undefined);
    action = "user.tier.change";
  } else if (body.action === "grant") {
    result = await grantAdminDays(id, body.days);
    action = "user.subscription.extend";
  } else if (body.action === "cancel") {
    result = await cancelAdminUser(id);
    action = "user.subscription.extend";
  } else if (body.action === "suspend" || body.action === "unsuspend") {
    result = await setAdminUserSuspended(id, body.action === "suspend");
  } else if (body.action === "resend") {
    result = await resendAdminLogin(id);
  } else if (body.action === "reset-onboarding") {
    result = await resetAdminOnboarding(id);
  } else if (body.action === "note") {
    result = await noteAdminUser(id, body.note);
    action = "user.note";
  } else if (body.action === "role") {
    result = await setAdminUserRole(id, body.role as UserRole);
    action = "user.role.change";
  } else {
    result = await revealAdminUserPhone(id);
    action = "user.reveal";
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const data = result.data as { before?: unknown; after?: unknown; phone?: string };
  const reason = "reason" in body ? body.reason : body.action === "note" ? body.note : undefined;
  await logAudit({
    userId: guard.user.id,
    action,
    entity: "User",
    entityId: id,
    reason,
    before: data.before,
    after: data.after,
    ip: getClientIp(req.headers)
  });
  if (body.action === "reveal") return NextResponse.json({ ok: true, phone: data.phone || "" });
  return NextResponse.json({ ok: true });
}

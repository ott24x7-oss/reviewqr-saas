import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminUserActionSchema } from "@reviewqr/shared";
import type { AuditAction } from "@/lib/admin";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import {
  cancelAdminUser,
  changeAdminUserPlan,
  grantAdminDays,
  loadAdminUser,
  noteAdminUser,
  resendAdminLogin,
  resetAdminOnboarding,
  revealAdminUserPhone,
  setAdminUserRole,
  setAdminUserSuspended
} from "@/lib/admin/people";
import type { ServiceResult } from "@/lib/api/result";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminUser(context?.params.id || ""));
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminUserActionSchema);
  if (!parsed.ok) return parsed.response;
  const id = context?.params.id || "";
  const body = parsed.data;
  if (body.action === "role" || (body.action === "grant" && body.days > 30)) {
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  let result: ServiceResult<unknown>;
  let action: AuditAction = "user.update";
  if (body.action === "plan") {
    result = await changeAdminUserPlan(id, body.planId, body.duration);
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
    result = await setAdminUserRole(id, body.role);
    action = "user.role.change";
  } else {
    result = await revealAdminUserPhone(id);
    action = "user.reveal";
  }
  return commitAdminWrite(auth.actor, req, result, {
    action,
    entity: "User",
    entityId: id,
    reason: body.action === "note" ? body.note : undefined
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

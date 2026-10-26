import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminPaymentActionSchema } from "@reviewqr/shared";
import type { AuditAction } from "@/lib/admin";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite, moneyReason } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import {
  approveAdminPayment,
  loadAdminPayment,
  reconcileAdminPayment,
  refundAdminPayment,
  rejectAdminPayment,
  resendAdminInvoice
} from "@/lib/admin/money";
import type { ServiceResult } from "@/lib/api/result";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminPayment(context?.params.id || ""));
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminPaymentActionSchema);
  if (!parsed.ok) return parsed.response;
  const id = context?.params.id || "";
  const body = parsed.data;
  if (body.action === "refund") {
    const missing = moneyReason(body.reason);
    if (missing) return missing;
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  let result: ServiceResult<unknown>;
  let action: AuditAction = "payment.approve";
  if (body.action === "approve") result = await approveAdminPayment(id);
  else if (body.action === "reject") {
    result = await rejectAdminPayment(id);
    action = "payment.reject";
  } else if (body.action === "refund") {
    result = await refundAdminPayment(id, body.refundUtr || "");
    action = "payment.refund";
  } else if (body.action === "reconcile") {
    result = await reconcileAdminPayment(id);
    action = "payment.reconcile";
  } else {
    result = await resendAdminInvoice(id);
    action = "payment.invoice";
  }
  return commitAdminWrite(auth.actor, req, result, {
    action,
    entity: "Payment",
    entityId: id,
    reason: body.reason,
    money: body.action === "refund"
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

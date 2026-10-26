import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminBusinessActionSchema } from "@reviewqr/shared";
import type { AuditAction } from "@/lib/admin";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor } from "@/lib/admin/guard";
import {
  loadAdminBusiness,
  noteAdminBusiness,
  revealAdminBusinessPhone,
  setAdminBusinessActive
} from "@/lib/admin/people";
import type { ServiceResult } from "@/lib/api/result";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminBusiness(context?.params.id || ""));
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminBusinessActionSchema);
  if (!parsed.ok) return parsed.response;
  const id = context?.params.id || "";
  const body = parsed.data;
  let result: ServiceResult<unknown>;
  let action: AuditAction = "business.suspend";
  if (body.action === "note") {
    result = await noteAdminBusiness(id, body.note);
    action = "business.note";
  } else if (body.action === "reveal") {
    result = await revealAdminBusinessPhone(id);
    action = "business.reveal";
  } else {
    result = await setAdminBusinessActive(id, body.action === "unsuspend");
  }
  return commitAdminWrite(auth.actor, req, result, {
    action,
    entity: "Business",
    entityId: id,
    reason: body.action === "note" ? body.note : undefined
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

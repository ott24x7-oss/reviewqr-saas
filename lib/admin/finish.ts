import type { NextRequest } from "next/server";
import type { AuditAction } from "@/lib/admin";
import { v1Data, v1Error, v1From } from "@/lib/api/v1";
import type { ServiceResult } from "@/lib/api/result";
import type { AdminActor } from "./actor";
import { writeAdminAudit } from "./audit-write";

/** Call this only after a successful change. Money routes must reject a missing reason first. */
export async function commitAdminWrite<T>(
  actor: AdminActor,
  req: NextRequest,
  result: ServiceResult<T>,
  audit: {
    action: AuditAction;
    entity: string;
    entityId?: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    money?: boolean;
  }
) {
  if (!result.ok) return v1From(result);
  const data = result.data;
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const written = await writeAdminAudit(actor, req, {
    action: audit.action,
    entity: audit.entity,
    entityId: audit.entityId,
    reason: audit.reason,
    metadata: audit.metadata,
    money: audit.money,
    before: record && "before" in record ? record.before : undefined,
    after: record && "after" in record ? record.after : data
  });
  if (!written.ok) return v1Error(written.status, "VALIDATION", written.error);
  return v1Data(result.data);
}

export function moneyReason(reason?: string | null) {
  if (!reason?.trim()) return v1Error(400, "VALIDATION", "A reason is required");
  return null;
}

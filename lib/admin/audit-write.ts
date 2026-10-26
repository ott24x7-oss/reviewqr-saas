import type { NextRequest } from "next/server";
import { logAudit, type AuditAction } from "@/lib/admin";
import type { AdminActor } from "./actor";

/** The one writer for an admin change. Web routes call logAudit with the same columns. */
export async function writeAdminAudit(
  actor: AdminActor,
  req: NextRequest | null,
  input: {
    action: AuditAction;
    entity?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    money?: boolean;
  }
) {
  if (input.money && !input.reason?.trim()) {
    return { ok: false as const, status: 400, error: "A reason is required" };
  }
  await logAudit({
    userId: actor.user.id,
    deviceId: actor.device.id,
    ip: actor.ip,
    userAgent: req?.headers.get("user-agent") || undefined,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    reason: input.reason,
    metadata: input.metadata
  });
  return { ok: true as const };
}

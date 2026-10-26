import { NextResponse } from "next/server";
import { featureById, type FeatureId } from "@reviewqr/shared";
import type { Fail } from "../api/result";
import { prisma } from "../db";
import { readableBusinessWhere, requireBusinessRole } from "../tenant";
import { moduleBlock } from "./entitlements";

/** 403 when the business owner's catalogue plan omits this feature's module. */
export async function featureBlock(ownerId: string, featureId: FeatureId): Promise<Fail | null> {
  const feature = featureById(featureId);
  if (!feature) return null;
  const locked = await moduleBlock(ownerId, feature.module);
  if (!locked) return null;
  return { ok: false, status: 403, error: locked, code: "PLAN_REQUIRED", feature: feature.id };
}

/**
 * A list that is not tied to one business. Staff are allowed when any business
 * they can read belongs to an owner who has the module. An account with no
 * business is not blocked.
 */
export async function accountFeatureBlock(userId: string, featureId: FeatureId): Promise<Fail | null> {
  const blocked = await featureBlock(userId, featureId);
  if (!blocked) return null;
  const rows = await prisma.business.findMany({
    where: readableBusinessWhere(userId),
    select: { ownerId: true },
    distinct: ["ownerId"]
  });
  for (const row of rows) {
    if (!(await featureBlock(row.ownerId, featureId))) return null;
  }
  if (!rows.length) return null;
  return blocked;
}

/** One business when the caller named it, otherwise the account-level list rule. */
export async function scopedFeatureBlock(userId: string, featureId: FeatureId, businessId?: string | null) {
  if (businessId) {
    const access = await requireBusinessRole(userId, businessId, "read");
    if (!access) return null;
    return featureBlock(access.ownerId, featureId);
  }
  return accountFeatureBlock(userId, featureId);
}

/** Web routes keep `{ error: string }` and add the plan code beside it. */
export function planDeniedResponse(blocked: Fail) {
  return NextResponse.json(
    { code: blocked.code ?? "PLAN_REQUIRED", feature: blocked.feature, error: blocked.error },
    { status: blocked.status }
  );
}

export async function denyFeatureResponse(ownerId: string, featureId: FeatureId) {
  const blocked = await featureBlock(ownerId, featureId);
  if (!blocked) return null;
  return planDeniedResponse(blocked);
}

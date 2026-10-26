import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type { AdminStepUpAction } from "@reviewqr/shared";
import { verifyAccessToken } from "@/lib/auth/access-token";
import { prisma } from "@/lib/db";

export const WEB_STEP_COOKIE = "admin_step_up";
/** The web admin has no device row; step-up tokens for the web carry this device id. */
export const WEB_STEP_DEVICE = "web";

/**
 * A web step-up works for the one action it was issued for, for this admin, and only
 * once: its jti is written to StepUpUse (shared with the admin app) and reuse is refused.
 */
export async function spendWebStepToken(token: string | undefined, userId: string, action: AdminStepUpAction) {
  if (!token) return false;
  const claims = verifyAccessToken(token);
  if (
    !claims ||
    claims.sub !== userId ||
    claims.aud !== "admin-step-up" ||
    claims.deviceId !== WEB_STEP_DEVICE ||
    claims.role !== "ADMIN" ||
    claims.act !== action ||
    !claims.jti ||
    claims.jti.length > 64
  ) {
    return false;
  }
  try {
    await prisma.stepUpUse.create({ data: { jti: claims.jti } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
  return true;
}

export function spendWebStepUp(req: NextRequest, userId: string, action: AdminStepUpAction) {
  return spendWebStepToken(req.cookies.get(WEB_STEP_COOKIE)?.value, userId, action);
}

/** 403 that tells the web dialog which action the code must be issued for. */
export function stepUpRequired(action: AdminStepUpAction, error = "Enter the WhatsApp code to confirm this") {
  return NextResponse.json({ error, stepUp: action }, { status: 403 });
}

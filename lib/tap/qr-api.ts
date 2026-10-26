import type { Prisma } from "@prisma/client";
import { qrClaimSchema, qrPatchSchema } from "@reviewqr/shared";
import { logAudit, logDeviceAudit, type AuditAction } from "../admin";
import { prisma } from "../db";
import { ownerLimitError } from "../entitlements";
import { featureBlock } from "../plans/feature-gate";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok } from "../api/result";
import { rateLimitDb } from "../rate-limit";
import { locationInBusiness, planOwner, requireBusinessRole, staffInBusiness } from "../tenant";
import { qrCodeSchema } from "../validations";
import { directContextForBusiness } from "./direct-board";
import { isLookupCode } from "./ids";
import { markOnboarding } from "./onboarding-mark";
import { codeFromScan } from "./qr-stock";
import { assignQr, createAssignedCode, setManyEnabled, setQrLabel, setQrLocation, type QrChange } from "./qr-mutate";
import { revalidateBusinessTap } from "./theme-store";

const qrInclude = {
  location: { select: { name: true, slug: true } },
  staff: { select: { name: true, slug: true } }
} satisfies Prisma.QRCodeInclude;

export type RequestMeta = { ip: string; userAgent?: string };

const limitSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} as const;

export async function listQrCodes(userId: string, businessId: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  const qrCodes = await prisma.qRCode.findMany({
    where: { businessId },
    include: qrInclude,
    orderBy: { createdAt: "desc" }
  });
  return ok({ qrCodes: await withOpens(access.id, qrCodes) });
}

export async function listQrPage(userId: string, businessId: string, page: PageQuery) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  const listed = await takePage(
    () =>
      prisma.qRCode.findMany({
        where: { businessId: access.id },
        include: qrInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  return ok({ items: await withOpens(access.id, listed.data.items), nextCursor: listed.data.nextCursor });
}

export async function createQrCode(userId: string, businessId: string, raw: unknown, meta: RequestMeta) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: limitSelect });
  if (!actor) return fail(401, "Unauthorized");
  const owner = await planOwner(actor, business.ownerId);
  if (!owner) return fail(404, "Not found");

  const parsed = qrCodeSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid request");
  const data = parsed.data;
  const [location, staff, qrCount] = await Promise.all([
    locationInBusiness(business.id, data.locationId),
    staffInBusiness(business.id, data.staffId),
    prisma.qRCode.count({ where: { business: { ownerId: business.ownerId } } })
  ]);
  if (!location.ok) return fail(400, location.error);
  if (!staff.ok) return fail(400, staff.error);
  if (qrCount >= 1) {
    const blocked = await featureBlock(business.ownerId, "multiple-qrs");
    if (blocked) return blocked;
  }
  const limitError = await ownerLimitError(owner, "qrCodes", qrCount);
  if (limitError) return fail(402, limitError);

  const qr = await createAssignedCode({
    businessId: business.id,
    type: data.type,
    label: data.label,
    locationId: data.locationId || null,
    staffId: data.staffId || null
  });
  await logAudit({
    userId,
    action: "qr.assign",
    entity: "QRCode",
    entityId: qr.id,
    metadata: { code: qr.shortCode, toBusinessId: business.id, label: qr.label, created: true },
    ip: meta.ip,
    userAgent: meta.userAgent
  });
  return ok({ qrCode: qr });
}

export async function patchQrCodes(userId: string, businessId: string, raw: unknown, meta: RequestMeta) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const parsed = qrPatchSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid request");
  const body = parsed.data;
  const codes = body.action === "label" || body.action === "location" || body.action === "direct" ? [body.code] : body.codes;
  if (codes.some((code) => !isLookupCode(code))) return fail(400, "Enter a valid QR code");

  if (body.action === "label") {
    const result = await setQrLabel(body.code, body.label, business.id);
    if (!result.ok) return fail(result.status, result.error);
    await writeQrAudit(userId, "qr.label", result.change, meta);
    return ok({ ok: true as const });
  }
  if (body.action === "location") {
    const result = await setQrLocation(body.code, body.locationId, business.id);
    if (!result.ok) return fail(result.status, result.error);
    await writeQrAudit(userId, "qr.location", result.change, meta);
    return ok({ ok: true as const });
  }
  if (body.action === "direct") {
    if (body.mode === "DIRECT") {
      const blocked = await featureBlock(business.ownerId, "direct-link");
      if (blocked) return blocked;
    }
    const target = (body.target || "").trim().slice(0, 40);
    if (body.mode === "DIRECT") {
      const allowed = await directTargets(business.id);
      if (!allowed.some((item) => item.key === target)) return fail(400, "Choose an enabled button");
    }
    const qr = await prisma.qRCode.findFirst({ where: { shortCode: body.code, businessId: business.id } });
    if (!qr) return fail(404, "Not found");
    await prisma.qRCode.update({
      where: { id: qr.id },
      data: { directMode: body.mode, directTarget: body.mode === "DIRECT" ? target : "" }
    });
    try {
      await revalidateBusinessTap(business.id);
    } catch {
      // The device row is saved. Cache tags are unavailable in a direct test call.
    }
    await logAudit({
      userId,
      action: "qr.direct",
      entity: "QRCode",
      entityId: qr.id,
      metadata: { code: qr.shortCode, mode: body.mode, target: body.mode === "DIRECT" ? target : "" },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return ok({ ok: true as const });
  }

  const result = await setManyEnabled(body.codes, business.id, body.action === "enable");
  if (!result.ok) return fail(result.status, result.error);
  const action: AuditAction = body.action === "enable" ? "qr.enable" : "qr.disable";
  for (const row of result.rows) {
    await writeQrAudit(
      userId,
      action,
      {
        id: row.id,
        code: row.shortCode,
        fromBusinessId: row.businessId,
        toBusinessId: row.businessId,
        fromStatus: row.status,
        toStatus: result.toStatus,
        label: row.label
      },
      meta
    );
  }
  for (const device of result.devices) {
    await logDeviceAudit({
      userId,
      deviceId: device.id,
      code: device.code,
      from: device.from,
      to: device.to,
      businessChanged: device.businessChanged,
      ip: meta.ip,
      userAgent: meta.userAgent
    });
  }
  return ok({ ok: true as const });
}

export type ClaimResult =
  | { ok: true; data: { ok: true; already: boolean; code: string } }
  | {
      ok: false;
      status: number;
      body: { error: string; message: string; support: boolean; needsConfirm: boolean };
    };

export async function claimQrCode(userId: string, businessId: string, raw: unknown, meta: RequestMeta): Promise<ClaimResult> {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) {
    return { ok: false, status: 404, body: { error: "Not found", message: "Not found", support: false, needsConfirm: false } };
  }
  const limit = await rateLimitDb({ key: `qr-claim:${userId}`, limit: 30, windowSeconds: 60 });
  if (!limit.ok) {
    return {
      ok: false,
      status: 429,
      body: {
        error: "Too many lookups. Try again in a minute.",
        message: "Too many lookups. Try again in a minute.",
        support: false,
        needsConfirm: false
      }
    };
  }
  const parsed = qrClaimSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Enter the code printed on the QR",
        message: "Enter the code printed on the QR",
        support: false,
        needsConfirm: false
      }
    };
  }
  const code = codeFromScan(parsed.data.code);
  if (!code) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Enter the code printed on the QR",
        message: "Enter the code printed on the QR",
        support: false,
        needsConfirm: false
      }
    };
  }

  const result = await assignQr({
    code,
    businessId: business.id,
    label: parsed.data.label,
    confirm: parsed.data.confirm === true,
    allowReassign: false
  });
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      body: {
        error: result.error,
        message: result.message || result.error,
        support: result.support === true,
        needsConfirm: result.needsConfirm === true
      }
    };
  }
  if (result.change) {
    await markOnboarding(business.ownerId, "printed_qr");
    await logAudit({
      userId,
      action: "qr.assign",
      entity: "QRCode",
      entityId: result.change.id,
      metadata: {
        code: result.change.code,
        fromBusinessId: result.change.fromBusinessId,
        toBusinessId: result.change.toBusinessId,
        label: result.change.label
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    if (result.device) {
      await logDeviceAudit({
        userId,
        deviceId: result.device.id,
        code: result.device.code,
        from: result.device.from,
        to: result.device.to,
        businessChanged: result.device.businessChanged,
        ip: meta.ip,
        userAgent: meta.userAgent
      });
    }
  }
  return { ok: true, data: { ok: true, already: result.already === true, code: result.change?.code || code } };
}

async function writeQrAudit(userId: string, action: AuditAction, change: QrChange, meta: RequestMeta) {
  await logAudit({
    userId,
    action,
    entity: "QRCode",
    entityId: change.id,
    metadata: {
      code: change.code,
      fromBusinessId: change.fromBusinessId,
      toBusinessId: change.toBusinessId,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      label: change.label
    },
    ip: meta.ip,
    userAgent: meta.userAgent
  });
}

async function directTargets(businessId: string) {
  const ctx = await directContextForBusiness(businessId);
  return ctx?.options || [];
}

async function withOpens<T extends { directMode: string; directTarget: string }>(businessId: string, rows: T[]) {
  const ctx = await directContextForBusiness(businessId);
  return rows.map((row) => {
    const open = ctx?.label(row.directMode, row.directTarget) || { labelEn: "Tap page", labelHi: "टैप पेज" };
    return { ...row, opensEn: open.labelEn, opensHi: open.labelHi };
  });
}

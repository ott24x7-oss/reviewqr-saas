import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { ownerLimitError, type LimitUser } from "@/lib/entitlements";
import { locationInBusiness } from "@/lib/tenant";
import { makeQrPublicId } from "./ids";
import { deviceFollowsQr, lostStatus, type DeviceStatusName } from "./device-status";
import { claimDecision, plainLabel, storedStatus, type QrStatusName } from "./qr-stock";
import { markOnboarding } from "./onboarding-mark";

const ownerSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} as const;

export type QrChange = {
  id: string;
  code: string;
  fromBusinessId: string | null;
  toBusinessId: string | null;
  fromStatus: QrStatusName;
  toStatus: QrStatusName;
  label: string;
};

export type DeviceFollow = {
  id: string;
  code: string;
  from: DeviceStatusName;
  to: DeviceStatusName;
  businessChanged: boolean;
};

class DeviceStatusError extends Error {
  constructor() {
    super("This tag cannot make that change");
    this.name = "DeviceStatusError";
  }
}

type Fail = { ok: false; status: number; error: string; support?: boolean; needsConfirm?: boolean; message?: string };
type Ok<T> = { ok: true } & T;

function fail(status: number, error: string, extra?: Omit<Fail, "ok" | "status" | "error">): Fail {
  return { ok: false, status, error, ...extra };
}

export async function findQr(code: string) {
  const include = {
    business: { select: { id: true, name: true, ownerId: true } }
  } as const;
  const exact = await prisma.qRCode.findUnique({ where: { shortCode: code }, include });
  if (exact) return exact;
  const upper = code.toUpperCase();
  if (upper === code) return null;
  return prisma.qRCode.findUnique({ where: { shortCode: upper }, include });
}

async function roomFor(ownerId: string, adding: number) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: ownerSelect });
  if (!owner) return "Business owner was not found";
  const used = await prisma.qRCode.count({ where: { business: { ownerId } } });
  return ownerLimitError(owner as LimitUser, "qrCodes", used, adding);
}

function touch(code: string, businessIds: Array<string | null>) {
  revalidateTag(`tap:${code}`);
  for (const id of businessIds) {
    if (id) revalidateTag(`biz:${id}`);
  }
}

async function syncDevice(
  tx: Prisma.TransactionClient,
  shortCode: string,
  qrStatus: QrStatusName,
  link: {
    businessId: string | null;
    locationId?: string | null;
    staffId?: string | null;
    tableLabel?: string | null;
  }
): Promise<DeviceFollow | null> {
  const device = await tx.device.findUnique({ where: { shortCode } });
  if (!device) return null;
  const next = deviceFollowsQr(device.status, qrStatus, link.businessId);
  if (!next) throw new DeviceStatusError();
  await tx.device.update({
    where: { id: device.id },
    data: {
      status: next,
      businessId: link.businessId,
      ...(link.locationId !== undefined ? { locationId: link.locationId } : {}),
      ...(link.staffId !== undefined ? { staffId: link.staffId } : {}),
      ...(link.tableLabel !== undefined ? { tableLabel: link.tableLabel } : {})
    }
  });
  return {
    id: device.id,
    code: shortCode,
    from: device.status,
    to: next,
    businessChanged: device.businessId !== link.businessId
  };
}

function statusFailure(error: unknown): Fail | null {
  if (error instanceof DeviceStatusError) return fail(409, error.message);
  return null;
}

export async function allocateQrId(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const shortCode = makeQrPublicId();
    const hit = await tx.qRCode.findUnique({ where: { shortCode }, select: { id: true } });
    if (!hit) return shortCode;
  }
  throw new Error("Could not allocate a QR id");
}

export async function generateStock(count: number) {
  const codes: string[] = [];
  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < count; i++) {
        const shortCode = await allocateQrId(tx);
        const flags = storedStatus("UNASSIGNED");
        await tx.qRCode.create({
          data: { shortCode, label: "Stock", type: "CUSTOM", ...flags }
        });
        codes.push(shortCode);
      }
    },
    { timeout: 20000 }
  );
  return codes;
}

export async function createAssignedCode(input: {
  businessId: string;
  label: string;
  type: "COUNTER" | "TABLE" | "BILL" | "CARD" | "POSTER" | "CUSTOM";
  locationId?: string | null;
  staffId?: string | null;
}) {
  const flags = storedStatus("ACTIVE");
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = makeQrPublicId();
    try {
      const qr = await prisma.qRCode.create({
        data: {
          shortCode,
          businessId: input.businessId,
          label: plainLabel(input.label) || "QR",
          type: input.type,
          locationId: input.locationId || null,
          staffId: input.staffId || null,
          assignedAt: new Date(),
          ...flags
        }
      });
      touch(qr.shortCode, [input.businessId]);
      const owner = await prisma.business.findUnique({ where: { id: input.businessId }, select: { ownerId: true } });
      if (owner) await markOnboarding(owner.ownerId, "qr_activated");
      return qr;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a QR id");
}

export async function assignQr(input: {
  code: string;
  businessId: string;
  label?: string;
  confirm: boolean;
  allowReassign: boolean;
}): Promise<Fail | Ok<{ change: QrChange | null; already?: boolean; device?: DeviceFollow | null }>> {
  const qr = await findQr(input.code);
  if (!qr) return fail(404, "This QR was not found");
  const business = await prisma.business.findFirst({
    where: { id: input.businessId, archived: false },
    select: { id: true, name: true, ownerId: true }
  });
  if (!business) return fail(404, "Business was not found");
  if (qr.status === "DISABLED") return fail(409, "This QR is disabled");

  const decision = claimDecision(
    { status: qr.status, businessId: qr.businessId, ownerId: qr.business?.ownerId || null },
    { businessId: business.id, businessName: business.name, ownerId: business.ownerId }
  );
  if (decision.action === "already") return { ok: true, change: null, already: true };
  if (decision.action === "blocked" && !input.allowReassign) {
    return fail(409, decision.message, { support: true });
  }
  if (decision.action === "disabled") return fail(409, decision.message);

  const message = decision.action === "activate" ? decision.message : `Reassign this QR to ${business.name}?`;
  if (!input.confirm) return fail(409, message, { needsConfirm: true, message });

  const sameOwner = qr.business?.ownerId === business.ownerId;
  const limitError = await roomFor(business.ownerId, sameOwner ? 0 : 1);
  if (limitError) return fail(402, limitError);

  const label = input.label ? plainLabel(input.label) : qr.label;
  const moved = qr.businessId !== business.id;
  const flags = storedStatus("ACTIVE");
  let updated;
  let device: DeviceFollow | null = null;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.qRCode.update({
        where: { id: qr.id },
        data: {
          businessId: business.id,
          label: label || qr.label,
          assignedAt: new Date(),
          locationId: moved ? null : qr.locationId,
          staffId: moved ? null : qr.staffId,
          ...flags
        }
      });
      const followed = await syncDevice(tx, row.shortCode, "ACTIVE", {
        businessId: business.id,
        locationId: moved ? null : qr.locationId,
        staffId: moved ? null : qr.staffId,
        tableLabel: row.label
      });
      return { row, followed };
    });
    updated = saved.row;
    device = saved.followed;
  } catch (error) {
    const blocked = statusFailure(error);
    if (blocked) return blocked;
    throw error;
  }
  touch(updated.shortCode, [qr.businessId, business.id]);
  await markOnboarding(business.ownerId, "qr_activated");
  return {
    ok: true,
    device,
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: business.id,
      fromStatus: qr.status,
      toStatus: "ACTIVE",
      label: updated.label
    }
  };
}

export async function unassignQr(code: string, confirm: boolean): Promise<Fail | Ok<{ change: QrChange; device: DeviceFollow | null }>> {
  const qr = await findQr(code);
  if (!qr) return fail(404, "This QR was not found");
  if (!confirm) return fail(409, "Return this QR to stock?", { needsConfirm: true, message: "Return this QR to stock?" });
  const flags = storedStatus("UNASSIGNED");
  let updated;
  let device: DeviceFollow | null = null;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.qRCode.update({
        where: { id: qr.id },
        data: { businessId: null, locationId: null, staffId: null, assignedAt: null, ...flags }
      });
      const followed = await syncDevice(tx, row.shortCode, "UNASSIGNED", {
        businessId: null,
        locationId: null,
        staffId: null,
        tableLabel: null
      });
      return { row, followed };
    });
    updated = saved.row;
    device = saved.followed;
  } catch (error) {
    const blocked = statusFailure(error);
    if (blocked) return blocked;
    throw error;
  }
  touch(updated.shortCode, [qr.businessId]);
  return {
    ok: true,
    device,
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: null,
      fromStatus: qr.status,
      toStatus: "UNASSIGNED",
      label: updated.label
    }
  };
}

export async function setQrEnabled(
  code: string,
  enabled: boolean,
  confirm: boolean,
  scopeBusinessId?: string
): Promise<Fail | Ok<{ change: QrChange; device: DeviceFollow | null }>> {
  const qr = await findQr(code);
  if (!qr) return fail(404, "This QR was not found");
  if (scopeBusinessId && qr.businessId !== scopeBusinessId) return fail(404, "This QR was not found");
  const message = enabled ? "Enable this QR?" : "Disable this QR?";
  if (!confirm) return fail(409, message, { needsConfirm: true, message });
  const next: QrStatusName = enabled ? (qr.businessId ? "ACTIVE" : "UNASSIGNED") : "DISABLED";
  const flags = storedStatus(next);
  let updated;
  let device: DeviceFollow | null = null;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.qRCode.update({ where: { id: qr.id }, data: flags });
      const followed = await syncDevice(tx, row.shortCode, next, { businessId: qr.businessId });
      return { row, followed };
    });
    updated = saved.row;
    device = saved.followed;
  } catch (error) {
    const blocked = statusFailure(error);
    if (blocked) return blocked;
    throw error;
  }
  touch(updated.shortCode, [qr.businessId]);
  return {
    ok: true,
    device,
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: qr.businessId,
      fromStatus: qr.status,
      toStatus: next,
      label: updated.label
    }
  };
}

export async function setManyEnabled(codes: string[], businessId: string, enabled: boolean) {
  const unique = Array.from(new Set(codes));
  const rows = await prisma.qRCode.findMany({
    where: { shortCode: { in: unique }, businessId },
    select: { id: true, shortCode: true, status: true, label: true, businessId: true }
  });
  if (rows.length !== unique.length) return fail(404, "A code was not found");
  const next: QrStatusName = enabled ? "ACTIVE" : "DISABLED";
  const devices: DeviceFollow[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.qRCode.update({ where: { id: row.id }, data: storedStatus(next) });
        const followed = await syncDevice(tx, row.shortCode, next, { businessId: row.businessId });
        if (followed) devices.push(followed);
      }
    });
  } catch (error) {
    const blocked = statusFailure(error);
    if (blocked) return blocked;
    throw error;
  }
  for (const row of rows) touch(row.shortCode, [businessId]);
  return { ok: true as const, rows, toStatus: next, devices };
}

export async function setQrLabel(code: string, label: string, scopeBusinessId: string) {
  const qr = await findQr(code);
  if (!qr || qr.businessId !== scopeBusinessId) return fail(404, "This QR was not found");
  const next = plainLabel(label);
  if (!next) return fail(400, "Enter a label");
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.qRCode.update({ where: { id: qr.id }, data: { label: next } });
    await tx.device.updateMany({ where: { shortCode: row.shortCode }, data: { tableLabel: row.label } });
    return row;
  });
  touch(updated.shortCode, [qr.businessId]);
  return {
    ok: true as const,
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: qr.businessId,
      fromStatus: qr.status,
      toStatus: qr.status,
      label: updated.label
    } satisfies QrChange
  };
}

export async function setQrLocation(code: string, locationId: string | null, scopeBusinessId: string) {
  const qr = await findQr(code);
  if (!qr || qr.businessId !== scopeBusinessId) return fail(404, "This QR was not found");
  const location = await locationInBusiness(scopeBusinessId, locationId);
  if (!location.ok) return fail(400, location.error);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.qRCode.update({
      where: { id: qr.id },
      data: { locationId: locationId || null }
    });
    await tx.device.updateMany({
      where: { shortCode: row.shortCode },
      data: { locationId: locationId || null }
    });
    return row;
  });
  touch(updated.shortCode, [qr.businessId]);
  return {
    ok: true as const,
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: qr.businessId,
      fromStatus: qr.status,
      toStatus: qr.status,
      label: updated.label
    } satisfies QrChange
  };
}

export async function markQrLost(code: string, confirm: boolean): Promise<Fail | Ok<{ change: QrChange; device: DeviceFollow }>> {
  const qr = await findQr(code);
  if (!qr) return fail(404, "This QR was not found");
  const device = await prisma.device.findUnique({ where: { shortCode: qr.shortCode } });
  if (!device) return fail(404, "This tag was not found");
  if (!confirm) return fail(409, "Mark this tag as lost?", { needsConfirm: true, message: "Mark this tag as lost?" });
  const next = lostStatus(device.status);
  if (!next) return fail(409, "This tag cannot be marked lost");
  const flags = storedStatus("DISABLED");
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.qRCode.update({ where: { id: qr.id }, data: flags });
    await tx.device.update({ where: { id: device.id }, data: { status: "LOST" } });
    return row;
  });
  touch(updated.shortCode, [qr.businessId]);
  return {
    ok: true,
    device: {
      id: device.id,
      code: updated.shortCode,
      from: device.status,
      to: "LOST",
      businessChanged: false
    },
    change: {
      id: updated.id,
      code: updated.shortCode,
      fromBusinessId: qr.businessId,
      toBusinessId: qr.businessId,
      fromStatus: qr.status,
      toStatus: "DISABLED",
      label: updated.label
    }
  };
}

import { prisma } from "@/lib/db";
import { ownerLimitError, type LimitUser } from "@/lib/entitlements";
import { batchSizeError, tableLabels } from "@/lib/print/batch";
import { templateById } from "@/lib/print/templates";
import { allocateQrId } from "./qr-mutate";
import { storedStatus } from "./qr-stock";

const ownerSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} as const;

type Fail = { ok: false; status: number; error: string };
type Made = { ok: true; batchId: string; codes: { code: string; label: string }[] };

function fail(status: number, error: string): Fail {
  return { ok: false, status, error };
}

export async function createBlankBatch(input: { count: number; templateId: string; userId: string }): Promise<Fail | Made> {
  const template = templateById(input.templateId);
  if (!template) return fail(400, "Choose a print template");
  const sizeError = batchSizeError(input.count);
  if (sizeError) return fail(400, sizeError);
  const labels = Array.from({ length: input.count }, () => "Stock");
  const made = await prisma.$transaction(
    async (tx) => {
      const batch = await tx.printBatch.create({
        data: {
          label: template.name,
          templateId: template.id,
          kind: template.kind,
          count: input.count,
          createdById: input.userId
        }
      });
      const codes: { code: string; label: string }[] = [];
      for (const label of labels) {
        const shortCode = await allocateQrId(tx);
        await tx.qRCode.create({
          data: { shortCode, label, type: "CUSTOM", ...storedStatus("UNASSIGNED") }
        });
        await tx.device.create({
          data: { shortCode, kind: template.kind, status: "IN_STOCK", batchId: batch.id, tableLabel: label }
        });
        codes.push({ code: shortCode, label });
      }
      return { batchId: batch.id, codes };
    },
    { timeout: 20000 }
  );
  return { ok: true, ...made };
}

export async function createTableBatch(input: {
  count: number;
  templateId: string;
  businessId: string;
  userId: string;
}): Promise<Fail | Made> {
  const template = templateById(input.templateId);
  if (!template) return fail(400, "Choose a print template");
  const sizeError = batchSizeError(input.count);
  if (sizeError) return fail(400, sizeError);
  const business = await prisma.business.findFirst({
    where: { id: input.businessId, archived: false },
    select: { id: true, ownerId: true }
  });
  if (!business) return fail(404, "Business was not found");
  const owner = await prisma.user.findUnique({ where: { id: business.ownerId }, select: ownerSelect });
  if (!owner) return fail(404, "Business owner was not found");
  const used = await prisma.qRCode.count({ where: { business: { ownerId: business.ownerId } } });
  const limitError = await ownerLimitError(owner as LimitUser, "qrCodes", used, input.count);
  if (limitError) return fail(402, limitError);

  const labels = tableLabels(input.count);
  const made = await prisma.$transaction(
    async (tx) => {
      const batch = await tx.printBatch.create({
        data: {
          label: `${template.name} tables`,
          templateId: template.id,
          kind: template.kind,
          count: input.count,
          createdById: input.userId
        }
      });
      const codes: { code: string; label: string }[] = [];
      for (const label of labels) {
        const shortCode = await allocateQrId(tx);
        await tx.qRCode.create({
          data: {
            shortCode,
            label,
            type: "TABLE",
            businessId: business.id,
            assignedAt: new Date(),
            ...storedStatus("ACTIVE")
          }
        });
        await tx.device.create({
          data: {
            shortCode,
            kind: template.kind,
            status: "ACTIVE",
            batchId: batch.id,
            businessId: business.id,
            tableLabel: label
          }
        });
        codes.push({ code: shortCode, label });
      }
      return { batchId: batch.id, codes };
    },
    { timeout: 20000 }
  );
  return { ok: true, ...made };
}

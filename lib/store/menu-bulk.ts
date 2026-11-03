import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { logAudit } from "../admin";
import { assertSafeOutboundUrl } from "../ssrf";
import { featureBlock } from "../plans/feature-gate";
import { limit } from "../plans/entitlements";
import { planOwner, requireBusinessRole } from "../tenant";
import { normalizeVeg } from "./entry";
import {
  buildBulkPreview, normalizeBulkItem, parseBulkFile, validateBulkRow,
  defaultBulkAction, type BulkAction
} from "./bulk";

const OWNER_SELECT = {
  id: true, subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true
} as const;

export async function previewMenuBulk(userId: string, businessId: string, bytes: Buffer, fileName: string) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return { error: "Not found", status: 404 } as const;
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: OWNER_SELECT });
  if (!actor) return { error: "Unauthorized", status: 401 } as const;
  const owner = await planOwner(actor, business.ownerId);
  if (!owner) return { error: "Not found", status: 404 } as const;
  const blocked = await featureBlock(owner.id, "menu");
  if (blocked) return { error: blocked.error, status: blocked.status } as const;

  let rows;
  try { rows = await parseBulkFile(bytes, fileName); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not read that file", status: 400 } as const; }
  if (!rows.length) return { error: "The file has no item rows", status: 400 } as const;
  if (rows.length > 500) return { error: "The file can contain at most 500 item rows", status: 400 } as const;

  const urlErrors = new Map<string, string>();
  const imageUrls = [...new Set(rows.map((row) => row.imageUrl.trim()).filter(Boolean))];
  for (let i = 0; i < imageUrls.length; i += 10) {
    await Promise.all(imageUrls.slice(i, i + 10).map(async (url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") throw new Error("Image URL must use HTTPS");
        await assertSafeOutboundUrl(url);
      } catch (error) {
        urlErrors.set(url, error instanceof Error ? error.message : "Image URL is unsafe");
      }
    }));
  }
  const validated = rows.map((row) => {
    const checks = validateBulkRow(row);
    const urlError = urlErrors.get(row.imageUrl.trim());
    if (urlError) checks.errors.push(`Image URL: ${urlError}`);
    return { row, checks };
  });
  const items = await prisma.menuItem.findMany({
    where: { businessId }, select: { id: true, name: true, barcode: true }
  });
  const categories = await prisma.menuCategory.findMany({ where: { businessId }, select: { name: true } });
  const used = await prisma.menuItem.count({ where: { businessId } });
  const cap = await limit(owner.id, "products");
  const result = buildBulkPreview(
    validated.map(({ row, checks }) => checks.errors.length ? { ...row, name: "" } : row),
    items, used, cap, categories.map((category) => category.name)
  );
  // Keep the original row values and show the actual validation messages.
  result.rows.forEach((preview, index) => {
    preview.row = rows[index];
    preview.errors = validated[index].checks.errors;
    preview.warnings = [...new Set([...preview.warnings, ...validated[index].checks.warnings])];
  });
  return { business, owner, preview: result } as const;
}

export type MenuBulkAction = { index: number; action: BulkAction };

export async function commitMenuBulk(userId: string, businessId: string, rows: unknown, actions: MenuBulkAction[], mode: "add_new" | "update_existing") {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return { error: "Not found", status: 404 } as const;
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: OWNER_SELECT });
  if (!actor) return { error: "Unauthorized", status: 401 } as const;
  const owner = await planOwner(actor, business.ownerId);
  if (!owner) return { error: "Not found", status: 404 } as const;
  const blocked = await featureBlock(owner.id, "menu");
  if (blocked) return { error: blocked.error, status: blocked.status } as const;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) return { error: "Send between 1 and 500 preview rows", status: 400 } as const;

  const source = rows as Array<Record<string, unknown>>;
  const normalizedRows = source.map((value) => ({
    name: String(value.name || "").trim(), price: String(value.price || "").trim(), mrp: String(value.mrp || "").trim(),
    category: String(value.category || "").trim(), nameHi: String(value.nameHi || "").trim(),
    description: String(value.description || "").trim(), veg: String(value.veg || "").trim(),
    brand: String(value.brand || "").trim(), barcode: String(value.barcode || "").trim(),
    kind: String(value.kind || "").trim(), durationMinutes: String(value.durationMinutes || "").trim(),
    available: String(value.available || "").trim(), imageUrl: String(value.imageUrl || "").trim(),
    colour: "", photo: ""
  }));
  const urlErrors = new Map<string, string>();
  const imageUrls = [...new Set(normalizedRows.map((row) => row.imageUrl).filter(Boolean))];
  for (let index = 0; index < imageUrls.length; index += 10) {
    await Promise.all(imageUrls.slice(index, index + 10).map(async (url) => {
      try {
        if (new URL(url).protocol !== "https:") throw new Error("Image URL must use HTTPS");
        await assertSafeOutboundUrl(url);
      } catch (error) { urlErrors.set(url, error instanceof Error ? error.message : "Image URL is unsafe"); }
    }));
  }
  const actionByIndex = new Map(actions.filter((action) => Number.isInteger(action.index) && ["add", "update", "skip"].includes(action.action)).map((action) => [action.index, action.action]));
  const items = await prisma.menuItem.findMany({ where: { businessId }, select: { id: true, name: true, barcode: true } });
  const categories = await prisma.menuCategory.findMany({ where: { businessId }, select: { id: true, name: true, sortOrder: true } });
  const itemMatch = (row: (typeof normalizedRows)[number]) => {
    if (row.barcode) {
      const barcode = items.find((item) => !!item.barcode && item.barcode === row.barcode);
      if (barcode) return barcode;
    }
    return items.find((item) => item.name.trim().toLowerCase() === row.name.trim().toLowerCase());
  };
  const seen = new Set<string>();
  const plans = normalizedRows.map((row, index) => {
    const errors = validateBulkRow(row).errors;
    if (urlErrors.has(row.imageUrl)) errors.push(`Image URL: ${urlErrors.get(row.imageUrl)}`);
    const key = row.name.toLowerCase();
    const duplicate = !!key && seen.has(key);
    if (key) seen.add(key);
    const matched = itemMatch(row);
    let action = actionByIndex.get(index) || defaultBulkAction(!!matched, duplicate, mode);
    if (errors.length) action = "skip";
    return { row, errors, matched, action };
  });
  const cap = await limit(owner.id, "products");
  let remaining = Math.max(0, cap - await prisma.menuItem.count({ where: { businessId } }));
  let skippedForLimit = 0;
  for (const plan of plans) {
    if (plan.action !== "add" || plan.errors.length) continue;
    if (remaining <= 0) { plan.action = "skip"; skippedForLimit++; }
    else remaining--;
  }

  let created = 0; let updated = 0; let skipped = 0; let failed = 0;
  const images: Array<{ itemId: string; rowIndex: number; url: string }> = [];
  const noPhotoItemIds: string[] = [];
  const accepted = plans.map((plan, index) => ({ ...plan, index })).filter((plan) => plan.action !== "skip");
  skipped += plans.length - accepted.length;
  for (let start = 0; start < accepted.length; start += 50) {
    const batch = accepted.slice(start, start + 50);
    try {
      const written = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
        let itemCount = await tx.menuItem.count({ where: { businessId } });
        const txCategories = await tx.menuCategory.findMany({ where: { businessId } });
        const categoryByName = new Map(txCategories.map((category) => [category.name.trim().toLowerCase(), category]));
        let sortOrder = txCategories.length;
        const saved: Array<{ itemId: string; rowIndex: number; url: string; action: "created" | "updated" }> = [];
        let skippedForLimit = 0;
        for (const plan of batch) {
          const { row } = plan;
          let categoryId: string | null = null;
          const categoryName = row.category.trim();
          if (categoryName) {
            let category = categoryByName.get(categoryName.toLowerCase());
            if (!category) {
              category = await tx.menuCategory.create({ data: { businessId, name: categoryName, sortOrder: sortOrder++ } });
              categoryByName.set(categoryName.toLowerCase(), category);
            }
            categoryId = category.id;
          }
          const normalized = normalizeBulkItem(row);
          const data = {
            categoryId, name: row.name.trim().slice(0, 120), nameHi: row.nameHi.trim() || null,
            pricePaise: normalized.pricePaise, mrpPaise: normalized.mrpPaise,
            priceType: normalized.priceType, kind: normalized.kind, durationMinutes: normalized.durationMinutes,
            description: row.description.trim() || null, veg: normalizeVeg(row.veg) || "NONE",
            brand: row.brand.trim().slice(0, 40), barcode: row.barcode.trim().slice(0, 64),
            available: normalized.available
          } satisfies Prisma.MenuItemUncheckedUpdateInput;
          if (plan.action === "update" && plan.matched) {
            await tx.menuItem.updateMany({ where: { id: plan.matched.id, businessId }, data });
            saved.push({ itemId: plan.matched.id, rowIndex: plan.index, url: row.imageUrl, action: "updated" });
          } else {
            if (itemCount >= cap) { skippedForLimit++; continue; }
            const item = await tx.menuItem.create({ data: { ...data, businessId, sortOrder: itemCount } });
            itemCount++;
            saved.push({ itemId: item.id, rowIndex: plan.index, url: row.imageUrl, action: "created" });
          }
        }
        const kinds = new Set(batch.map((plan) => normalizeBulkItem(plan.row).kind));
        if (kinds.has("SERVICE") && kinds.has("PRODUCT")) {
          await tx.business.update({ where: { id: businessId }, data: { catalogMode: "BOTH" } });
        } else if (kinds.has("SERVICE") && business.catalogMode === "MENU") {
          await tx.business.update({ where: { id: businessId }, data: { catalogMode: "SERVICES" } });
        } else if (kinds.has("PRODUCT") && business.catalogMode === "SERVICES") {
          await tx.business.update({ where: { id: businessId }, data: { catalogMode: "BOTH" } });
        }
        return { saved, skippedForLimit };
      });
      skippedForLimit += written.skippedForLimit;
      skipped += written.skippedForLimit;
      for (const row of written.saved) {
        if (row.action === "created") created++; else updated++;
        if (row.url) images.push({ itemId: row.itemId, rowIndex: row.rowIndex, url: row.url });
        else noPhotoItemIds.push(row.itemId);
      }
    } catch {
      failed += batch.length;
    }
  }

  const imageJobs: Array<{ jobId: string; itemId: string; rowIndex: number }> = [];
  for (const image of images) {
    try {
      const { enqueueJob } = await import("../jobs/store");
      const job = await enqueueJob({
        type: "menu.import-image",
        payload: { businessId, itemId: image.itemId, imageUrl: image.url, requestedById: userId },
        idempotencyKey: `menu-import-image:${businessId}:${image.itemId}:${randomUUID()}`
      });
      imageJobs.push({ jobId: job.id, itemId: image.itemId, rowIndex: image.rowIndex });
    } catch { /* The menu commit remains valid; expose this row as an image failure. */ }
  }
  const queuedRows = new Set(imageJobs.map((job) => job.rowIndex));
  const imageErrors = images.filter((image) => !queuedRows.has(image.rowIndex)).map((image) => ({ rowIndex: image.rowIndex, itemId: image.itemId, error: "Could not queue image download" }));
  const imageQueueFailures = imageErrors.length;
  const noPhoto = noPhotoItemIds.length
    ? await prisma.menuItem.count({ where: { businessId, id: { in: noPhotoItemIds }, photo: null, photos: { isEmpty: true } } })
    : 0;
  await logAudit({
    userId, action: "menu.bulk.import", entity: "Business", entityId: businessId,
    metadata: { created, updated, skipped, failed, imageJobs: imageJobs.length, imageQueueFailures, mode }
  });
  return { created, updated, skipped, failed, skippedForLimit, noPhoto, imageJobs, imageErrors, imageQueueFailures } as const;
}

export async function getMenuImportImageJobs(userId: string, businessId: string, ids: string[]) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return null;
  const jobs = await prisma.job.findMany({ where: { id: { in: ids.slice(0, 500) }, type: "menu.import-image" } });
  return jobs.filter((job) => {
    const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
    return payload.businessId === businessId;
  }).map((job) => {
    const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
    return { jobId: job.id, itemId: String(payload.itemId || ""), status: job.status, error: job.lastError || null };
  });
}

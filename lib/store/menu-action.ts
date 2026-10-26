import type { Prisma } from "@prisma/client";
import { menuActionSchema } from "@reviewqr/shared";
import { prisma } from "../db";
import { ownerLimitError } from "../entitlements";
import { limit } from "../plans/entitlements";
import { featureBlock } from "../plans/feature-gate";
import { adjustedPricePaise } from "./variants";
import { flattenTemplate, isServiceTemplate, templateById } from "./templates";
import { takeForSave } from "./entry";
import { revalidateBusinessTap } from "../tap/theme-store";
import { planOwner, requireBusinessRole } from "../tenant";
import { fail, ok, type Fail, type ServiceResult } from "../api/result";

const limitSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} satisfies Prisma.UserSelect;

type MenuOk = {
  ok: true;
  message?: string;
  added?: number;
  variantId?: string;
};

type MenuBody = ReturnType<typeof menuActionSchema.parse>;

/** Menu writes. The caller has already authenticated the user. */
export async function runMenuAction(userId: string, businessId: string, raw: unknown): Promise<ServiceResult<MenuOk>> {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: limitSelect });
  if (!actor) return fail(401, "Unauthorized");
  const owner = await planOwner(actor, business.ownerId);
  if (!owner) return fail(404, "Not found");
  const locked = await featureBlock(owner.id, "menu");
  if (locked) return locked;

  const parsed = menuActionSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message || "Invalid input");
  }
  const data = parsed.data;
  const count = await prisma.menuItem.count({ where: { businessId: business.id } });
  let message = "";
  let added = 0;
  let variantId = "";

  if (data.action === "template") {
    const chosen = flattenTemplate(templateById(data.templateId));
    const productCap = await limit(owner.id, "products");
    const fit = takeForSave(chosen.length, count, productCap);
    if (fit.take === 0) {
      const limitError = await ownerLimitError(owner, "storeProducts", count, 1);
      return fail(402, limitError || "Your plan has no room for more products.");
    }
    await prisma.$transaction(async (tx) => {
      const existing = await tx.menuCategory.findMany({ where: { businessId: business.id } });
      const byName = new Map(existing.map((category) => [category.name.trim().toLowerCase(), category]));
      let sortBase = existing.length;
      for (const [index, row] of chosen.slice(0, fit.take).entries()) {
        const key = row.category.trim().toLowerCase();
        let category = byName.get(key);
        if (!category) {
          category = await tx.menuCategory.create({
            data: {
              businessId: business.id,
              name: row.category,
              nameHi: row.categoryHi || null,
              sortOrder: sortBase
            }
          });
          sortBase += 1;
          byName.set(key, category);
        }
        await tx.menuItem.create({
          data: {
            businessId: business.id,
            categoryId: category.id,
            name: row.item.name,
            nameHi: row.item.nameHi || null,
            pricePaise: row.item.pricePaise,
            veg: row.item.veg,
            description: row.item.description || null,
            bestseller: row.item.bestseller === true,
            brand: row.item.brand || "",
            durationMinutes: row.item.durationMinutes ?? null,
            kind: isServiceTemplate(data.templateId) || row.item.durationMinutes != null ? "SERVICE" : "PRODUCT",
            priceType: row.item.priceType || "FIXED",
            bookable: true,
            sortOrder: count + index
          }
        });
      }
      if (isServiceTemplate(data.templateId) && business.catalogMode === "MENU") {
        await tx.business.update({ where: { id: business.id }, data: { catalogMode: "SERVICES" } });
      }
    });
    added = fit.take;
    message = fit.skipped > 0 ? `Added ${fit.take} items. ${fit.skipped} did not fit the plan.` : `Added ${fit.take} items.`;
  } else if (data.action === "category") {
    const name = (data.name || "").trim();
    if (!name) return fail(400, "Name the category");
    await prisma.menuCategory.create({
      data: { businessId: business.id, name, nameHi: (data.nameHi || "").trim() || null }
    });
  } else if (data.action === "item") {
    let categoryId = data.categoryId || null;
    if (categoryId && !(await categoryOwned(business.id, categoryId))) {
      return fail(400, "Category not found");
    }
    const categoryName = (data.category || "").trim();
    if (!categoryId && categoryName) {
      const found = await prisma.menuCategory.findFirst({
        where: { businessId: business.id, name: { equals: categoryName, mode: "insensitive" } }
      });
      categoryId =
        found?.id ||
        (
          await prisma.menuCategory.create({
            data: { businessId: business.id, name: categoryName }
          })
        ).id;
    }
    const limitError = await ownerLimitError(owner, "storeProducts", count);
    if (limitError) return fail(402, limitError);
    const name = (data.name || "").trim();
    if (!name) return fail(400, "Name the item");
    const created = await prisma.menuItem.create({
      data: {
        businessId: business.id,
        categoryId,
        name,
        nameHi: (data.nameHi || "").trim() || null,
        pricePaise: Math.round((data.priceRupees || 0) * 100),
        mrpPaise: mrpPaise(data.mrpRupees, data.priceRupees || 0),
        description: (data.description || "").trim() || null,
        bestseller: data.bestseller === true,
        veg: data.veg || "NONE",
        available: data.available !== false,
        photo: (data.photo || "").trim() || null,
        photos: (data.photos || []).map((src) => src.trim()).filter(Boolean).slice(0, 5),
        brand: (data.brand || "").trim().slice(0, 40),
        durationMinutes: data.durationMinutes ?? null,
        kind: data.itemKind || (data.durationMinutes != null ? "SERVICE" : "PRODUCT"),
        priceType: data.priceType || "FIXED",
        bookable: data.bookable !== false,
        barcode: (data.barcode || "").trim().slice(0, 64)
      }
    });
    const colour = (data.colour || "").trim().slice(0, 40);
    if (colour) {
      await prisma.menuVariant.create({
        data: {
          itemId: created.id,
          businessId: business.id,
          label: colour,
          colour,
          pricePaise: created.pricePaise,
          sortOrder: 0
        }
      });
    }
  } else if (data.action === "update" && data.id) {
    if (data.categoryId && !(await categoryOwned(business.id, data.categoryId))) {
      return fail(400, "Category not found");
    }
    await prisma.menuItem.updateMany({
      where: { id: data.id, businessId: business.id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.nameHi !== undefined ? { nameHi: data.nameHi.trim() || null } : {}),
        ...(data.priceRupees !== undefined ? { pricePaise: Math.round(data.priceRupees * 100) } : {}),
        ...(data.mrpRupees !== undefined
          ? { mrpPaise: data.mrpRupees === null ? null : Math.round(data.mrpRupees * 100) }
          : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.bestseller !== undefined ? { bestseller: data.bestseller } : {}),
        ...(data.veg ? { veg: data.veg } : {}),
        ...(data.available !== undefined ? { available: data.available } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.photo !== undefined ? { photo: data.photo.trim() || null } : {}),
        ...(data.photos !== undefined
          ? { photos: data.photos.map((src) => src.trim()).filter(Boolean).slice(0, 5) }
          : {}),
        ...(data.brand !== undefined ? { brand: data.brand.trim().slice(0, 40) } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.itemKind ? { kind: data.itemKind } : {}),
        ...(data.priceType ? { priceType: data.priceType } : {}),
        ...(data.bookable !== undefined ? { bookable: data.bookable } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode.trim().slice(0, 64) } : {})
      }
    });
  } else if (data.action === "items") {
    const rows = data.items || [];
    if (!rows.length) return fail(400, "Add at least one item");
    const productCap = await limit(owner.id, "products");
    const fit = takeForSave(rows.length, count, productCap);
    if (fit.take === 0) {
      const limitError = await ownerLimitError(owner, "storeProducts", count, 1);
      return fail(402, limitError || "Your plan has no room for more products.");
    }
    await prisma.$transaction(async (tx) => {
      const existing = await tx.menuCategory.findMany({ where: { businessId: business.id } });
      const byName = new Map(existing.map((category) => [category.name.trim().toLowerCase(), category]));
      let sortBase = existing.length;
      for (const [index, item] of rows.slice(0, fit.take).entries()) {
        let categoryId: string | null = null;
        const categoryName = (item.category || "").trim();
        if (categoryName) {
          const key = categoryName.toLowerCase();
          let category = byName.get(key);
          if (!category) {
            category = await tx.menuCategory.create({
              data: { businessId: business.id, name: categoryName, sortOrder: sortBase }
            });
            sortBase += 1;
            byName.set(key, category);
          }
          categoryId = category.id;
        }
        const created = await tx.menuItem.create({
          data: {
            businessId: business.id,
            categoryId,
            name: item.name.trim(),
            nameHi: (item.nameHi || "").trim() || null,
            pricePaise: Math.round(item.priceRupees * 100),
            mrpPaise: mrpPaise(item.mrpRupees, item.priceRupees),
            description: (item.description || "").trim() || null,
            veg: item.veg || "NONE",
            brand: (item.brand || "").trim().slice(0, 40),
            photo: (item.photo || "").trim() || null,
            barcode: (item.barcode || "").trim().slice(0, 64),
            durationMinutes: item.durationMinutes ?? null,
            kind: item.itemKind || (item.durationMinutes != null ? "SERVICE" : "PRODUCT"),
            priceType: item.priceType || "FIXED",
            bookable: item.bookable !== false,
            sortOrder: count + index
          }
        });
        const colour = (item.colour || "").trim().slice(0, 40);
        if (colour) {
          await tx.menuVariant.create({
            data: {
              itemId: created.id,
              businessId: business.id,
              label: colour,
              colour,
              pricePaise: created.pricePaise,
              sortOrder: 0
            }
          });
        }
      }
    });
    added = fit.take;
    message = fit.skipped > 0 ? `Added ${fit.take} items. ${fit.skipped} did not fit the plan.` : `Added ${fit.take} items.`;
  } else if (data.action === "category-rename" && data.id) {
    const name = (data.name || "").trim();
    if (!name) return fail(400, "Name the category");
    await prisma.menuCategory.updateMany({
      where: { id: data.id, businessId: business.id },
      data: { name }
    });
  } else if (data.action === "category-reorder") {
    const ids = data.ids || [];
    if (!ids.length) return fail(400, "Choose the category order");
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.menuCategory.updateMany({
          where: { id, businessId: business.id },
          data: { sortOrder: index }
        })
      )
    );
  } else if (data.action === "delete" && data.id) {
    if (data.kind === "category") {
      await prisma.menuCategory.deleteMany({ where: { id: data.id, businessId: business.id } });
    } else {
      await prisma.menuItem.deleteMany({ where: { id: data.id, businessId: business.id } });
    }
  } else if (data.action === "variant" && data.id) {
    const saved = await createVariant(business.id, data);
    if (saved) return saved;
  } else if (data.action === "variant-update" && data.id) {
    const saved = await updateVariant(business.id, data);
    if (saved) return saved;
  } else if (data.action === "variant-delete" && data.id) {
    await prisma.menuVariant.deleteMany({ where: { id: data.id, businessId: business.id } });
  } else if (data.action === "addon" && data.id) {
    const saved = await createAddOn(business.id, data);
    if (saved) return saved;
  } else if (data.action === "addon-update" && data.id) {
    const saved = await updateAddOn(business.id, data);
    if (saved) return saved;
  } else if (data.action === "addon-delete" && data.id) {
    await prisma.menuAddOn.deleteMany({ where: { id: data.id, businessId: business.id } });
  } else if (data.action === "bulk-price") {
    const saved = await bulkPrice(business.id, data);
    if (saved) return saved;
  } else if (data.action === "duplicate" && data.id) {
    const item = await prisma.menuItem.findFirst({ where: { id: data.id, businessId: business.id } });
    if (!item) return fail(400, "Item not found");
    if (data.kind === "item") {
      const limitError = await ownerLimitError(owner, "storeProducts", count);
      if (limitError) return fail(402, limitError);
      await prisma.menuItem.create({
        data: {
          businessId: business.id,
          categoryId: item.categoryId,
          name: item.name,
          nameHi: item.nameHi,
          pricePaise: item.pricePaise,
          mrpPaise: item.mrpPaise,
          description: item.description,
          bestseller: item.bestseller,
          veg: item.veg,
          available: item.available,
          photo: item.photo,
          photos: item.photos,
          brand: item.brand,
          durationMinutes: item.durationMinutes,
          kind: item.kind,
          priceType: item.priceType,
          bookable: item.bookable,
          sortOrder: count
        }
      });
      added = 1;
      message = "Added a copy.";
    } else {
      const sortOrder = await prisma.menuVariant.count({ where: { itemId: item.id } });
      const variant = await prisma.menuVariant.create({
        data: {
          itemId: item.id,
          businessId: business.id,
          label: "",
          pricePaise: item.pricePaise,
          sortOrder
        }
      });
      variantId = variant.id;
      message = "Add a size or colour.";
    }
  } else {
    return fail(400, "Unknown action");
  }

  await revalidateBusinessTap(business.id);
  return ok({
    ok: true,
    ...(message ? { message, added } : {}),
    ...(variantId ? { variantId } : {})
  });
}

function mrpPaise(mrpRupees: number | null | undefined, priceRupees: number) {
  if (mrpRupees == null || mrpRupees <= priceRupees) return null;
  return Math.round(mrpRupees * 100);
}

async function categoryOwned(businessId: string, categoryId: string) {
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, businessId },
    select: { id: true }
  });
  return !!category;
}

function variantLabel(label: string, size: string, colour: string) {
  const named = label.trim();
  if (named) return named;
  return [size.trim(), colour.trim()].filter(Boolean).join(" / ");
}

async function createVariant(businessId: string, data: MenuBody): Promise<Fail | null> {
  const item = await prisma.menuItem.findFirst({ where: { id: data.id, businessId }, select: { id: true } });
  if (!item) return fail(400, "Item not found");
  const size = (data.size || "").trim();
  const colour = (data.colour || "").trim();
  const label = variantLabel(data.name || "", size, colour);
  if (!label) return fail(400, "Name the option");
  const sortOrder = await prisma.menuVariant.count({ where: { itemId: item.id } });
  await prisma.menuVariant.create({
    data: {
      itemId: item.id,
      businessId,
      label,
      labelHi: (data.nameHi || "").trim() || null,
      size,
      colour,
      pricePaise: Math.round((data.priceRupees || 0) * 100),
      durationMinutes: data.durationMinutes ?? null,
      inStock: data.inStock !== false,
      sortOrder
    }
  });
  return null;
}

async function updateVariant(businessId: string, data: MenuBody): Promise<Fail | null> {
  const row = await prisma.menuVariant.findFirst({ where: { id: data.id, businessId } });
  if (!row) return fail(400, "Option not found");
  const size = data.size !== undefined ? data.size.trim() : row.size;
  const colour = data.colour !== undefined ? data.colour.trim() : row.colour;
  const label = data.name !== undefined ? variantLabel(data.name, size, colour) : variantLabel(row.label, size, colour);
  await prisma.menuVariant.update({
    where: { id: row.id },
    data: {
      label,
      size,
      colour,
      ...(data.nameHi !== undefined ? { labelHi: data.nameHi.trim() || null } : {}),
      ...(data.priceRupees !== undefined ? { pricePaise: Math.round(data.priceRupees * 100) } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.inStock !== undefined ? { inStock: data.inStock } : {})
    }
  });
  return null;
}

async function createAddOn(businessId: string, data: MenuBody): Promise<Fail | null> {
  const item = await prisma.menuItem.findFirst({ where: { id: data.id, businessId }, select: { id: true } });
  if (!item) return fail(400, "Item not found");
  const name = (data.name || "").trim();
  if (!name) return fail(400, "Name the add-on");
  const sortOrder = await prisma.menuAddOn.count({ where: { itemId: item.id } });
  await prisma.menuAddOn.create({
    data: {
      itemId: item.id,
      businessId,
      name,
      nameHi: (data.nameHi || "").trim() || null,
      pricePaise: Math.round((data.priceRupees || 0) * 100),
      inStock: data.inStock !== false,
      sortOrder
    }
  });
  return null;
}

async function updateAddOn(businessId: string, data: MenuBody): Promise<Fail | null> {
  const row = await prisma.menuAddOn.findFirst({ where: { id: data.id, businessId } });
  if (!row) return fail(400, "Add-on not found");
  const name = data.name !== undefined ? data.name.trim() : row.name;
  if (!name) return fail(400, "Name the add-on");
  await prisma.menuAddOn.update({
    where: { id: row.id },
    data: {
      name,
      ...(data.nameHi !== undefined ? { nameHi: data.nameHi.trim() || null } : {}),
      ...(data.priceRupees !== undefined ? { pricePaise: Math.round(data.priceRupees * 100) } : {}),
      ...(data.inStock !== undefined ? { inStock: data.inStock } : {})
    }
  });
  return null;
}

async function bulkPrice(businessId: string, data: MenuBody): Promise<Fail | null> {
  if (!data.mode || data.amount === undefined) {
    return fail(400, "Enter a price change");
  }
  if (data.mode === "percent" && (data.amount < -50 || data.amount > 200)) {
    return fail(400, "Use a percent between -50 and 200");
  }
  if (data.categoryId && !(await categoryOwned(businessId, data.categoryId))) {
    return fail(400, "Category not found");
  }
  const items = await prisma.menuItem.findMany({
    where: { businessId, ...(data.categoryId ? { categoryId: data.categoryId } : {}) },
    include: { variants: { select: { id: true, pricePaise: true } } }
  });
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.menuItem.update({
        where: { id: item.id },
        data: { pricePaise: adjustedPricePaise(item.pricePaise, data.mode!, data.amount!) }
      });
      for (const variant of item.variants) {
        await tx.menuVariant.update({
          where: { id: variant.id },
          data: { pricePaise: adjustedPricePaise(variant.pricePaise, data.mode!, data.amount!) }
        });
      }
    }
  });
  return null;
}

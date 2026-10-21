import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planOwner, requireBusinessRole } from "@/lib/tenant";
import { ownerLimitError } from "@/lib/entitlements";
import { effectiveTier, getPlan } from "@/lib/payments";
import { revalidateBusinessTap } from "@/lib/tap/theme-store";
import { takeForSave } from "@/lib/store/entry";
import { flattenTemplate, templateById } from "@/lib/store/templates";
import { adjustedPricePaise } from "@/lib/store/variants";

const veg = z.enum(["VEG", "NON_VEG", "EGG", "NONE"]);
const schema = z.object({
  action: z.enum([
    "category",
    "item",
    "update",
    "delete",
    "template",
    "items",
    "variant",
    "variant-update",
    "variant-delete",
    "addon",
    "addon-update",
    "addon-delete",
    "bulk-price",
    "duplicate"
  ]),
  id: z.string().optional(),
  kind: z.enum(["item", "category", "variant"]).optional(),
  name: z.string().max(80).optional(),
  nameHi: z.string().max(80).optional(),
  priceRupees: z.number().min(0).max(100000).optional(),
  mrpRupees: z.number().min(0).max(100000).nullable().optional(),
  description: z.string().max(200).optional(),
  bestseller: z.boolean().optional(),
  veg: veg.optional(),
  categoryId: z.string().nullable().optional(),
  available: z.boolean().optional(),
  photo: z.string().max(1_500_000).optional(),
  photos: z.array(z.string().max(1_500_000)).max(5).optional(),
  brand: z.string().max(40).optional(),
  durationMinutes: z.number().int().min(1).max(480).nullable().optional(),
  barcode: z.string().max(64).optional(),
  category: z.string().max(80).optional(),
  templateId: z.enum(["cafe", "restaurant", "mobile", "clothing", "kirana", "salon"]).optional(),
  size: z.string().max(40).optional(),
  colour: z.string().max(40).optional(),
  inStock: z.boolean().optional(),
  mode: z.enum(["percent", "rupees"]).optional(),
  amount: z.number().finite().min(-100000).max(100000).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        priceRupees: z.number().min(0).max(100000),
        veg: veg.optional(),
        category: z.string().max(80).optional(),
        nameHi: z.string().max(80).optional(),
        description: z.string().max(200).optional(),
        brand: z.string().max(40).optional(),
        mrpRupees: z.number().min(0).max(100000).nullable().optional(),
        colour: z.string().max(40).optional(),
        photo: z.string().max(1_500_000).optional(),
        barcode: z.string().max(64).optional(),
        durationMinutes: z.number().int().min(1).max(480).nullable().optional()
      })
    )
    .max(50)
    .optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owner = await planOwner(user, business.ownerId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const count = await prisma.menuItem.count({ where: { businessId: business.id } });
  let message = "";
  let added = 0;
  let variantId = "";

  if (data.action === "template") {
    const chosen = flattenTemplate(templateById(data.templateId));
    const limit = (await getPlan(effectiveTier(owner))).limits.storeProducts;
    const fit = takeForSave(chosen.length, count, limit);
    if (fit.take === 0) {
      const limitError = await ownerLimitError(owner, "storeProducts", count, 1);
      return NextResponse.json({ error: limitError || "Your plan has no room for more products." }, { status: 402 });
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
            sortOrder: count + index
          }
        });
      }
    });
    added = fit.take;
    message = fit.skipped > 0 ? `Added ${fit.take} items. ${fit.skipped} did not fit the plan.` : `Added ${fit.take} items.`;
  } else if (data.action === "category") {
    const name = (data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name the category" }, { status: 400 });
    await prisma.menuCategory.create({
      data: { businessId: business.id, name, nameHi: (data.nameHi || "").trim() || null }
    });
  } else if (data.action === "item") {
    let categoryId = data.categoryId || null;
    if (categoryId && !(await categoryOwned(business.id, categoryId))) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    const categoryName = (data.category || "").trim();
    if (!categoryId && categoryName) {
      const found = await prisma.menuCategory.findFirst({
        where: { businessId: business.id, name: { equals: categoryName, mode: "insensitive" } }
      });
      categoryId = found?.id || (await prisma.menuCategory.create({
        data: { businessId: business.id, name: categoryName }
      })).id;
    }
    const limitError = await ownerLimitError(owner, "storeProducts", count);
    if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
    const name = (data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name the item" }, { status: 400 });
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
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
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
        ...(data.photos !== undefined ? { photos: data.photos.map((src) => src.trim()).filter(Boolean).slice(0, 5) } : {}),
        ...(data.brand !== undefined ? { brand: data.brand.trim().slice(0, 40) } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode.trim().slice(0, 64) } : {})
      }
    });
  } else if (data.action === "items") {
    const rows = data.items || [];
    if (!rows.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
    const limit = (await getPlan(effectiveTier(owner))).limits.storeProducts;
    const fit = takeForSave(rows.length, count, limit);
    if (fit.take === 0) {
      const limitError = await ownerLimitError(owner, "storeProducts", count, 1);
      return NextResponse.json({ error: limitError || "Your plan has no room for more products." }, { status: 402 });
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
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 400 });
    if (data.kind === "item") {
      const limitError = await ownerLimitError(owner, "storeProducts", count);
      if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
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
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await revalidateBusinessTap(business.id);
  return NextResponse.json({
    ok: true,
    ...(message ? { message, added } : {}),
    ...(variantId ? { variantId } : {})
  });
}

/** A crossed-out price only makes sense above the selling price. */
function mrpPaise(mrpRupees: number | null | undefined, priceRupees: number) {
  if (mrpRupees == null || mrpRupees <= priceRupees) return null;
  return Math.round(mrpRupees * 100);
}

async function categoryOwned(businessId: string, categoryId: string) {
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, businessId }, select: { id: true } });
  return !!category;
}

type MenuBody = z.infer<typeof schema>;

function variantLabel(label: string, size: string, colour: string) {
  const named = label.trim();
  if (named) return named;
  return [size.trim(), colour.trim()].filter(Boolean).join(" / ");
}

async function createVariant(businessId: string, data: MenuBody) {
  const item = await prisma.menuItem.findFirst({ where: { id: data.id, businessId }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 400 });
  const size = (data.size || "").trim();
  const colour = (data.colour || "").trim();
  const label = variantLabel(data.name || "", size, colour);
  if (!label) return NextResponse.json({ error: "Name the option" }, { status: 400 });
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
      inStock: data.inStock !== false,
      sortOrder
    }
  });
  return null;
}

async function updateVariant(businessId: string, data: MenuBody) {
  const row = await prisma.menuVariant.findFirst({ where: { id: data.id, businessId } });
  if (!row) return NextResponse.json({ error: "Option not found" }, { status: 400 });
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
      ...(data.inStock !== undefined ? { inStock: data.inStock } : {})
    }
  });
  return null;
}

async function createAddOn(businessId: string, data: MenuBody) {
  const item = await prisma.menuItem.findFirst({ where: { id: data.id, businessId }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 400 });
  const name = (data.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name the add-on" }, { status: 400 });
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

async function updateAddOn(businessId: string, data: MenuBody) {
  const row = await prisma.menuAddOn.findFirst({ where: { id: data.id, businessId } });
  if (!row) return NextResponse.json({ error: "Add-on not found" }, { status: 400 });
  const name = data.name !== undefined ? data.name.trim() : row.name;
  if (!name) return NextResponse.json({ error: "Name the add-on" }, { status: 400 });
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

async function bulkPrice(businessId: string, data: MenuBody) {
  if (!data.mode || data.amount === undefined) {
    return NextResponse.json({ error: "Enter a price change" }, { status: 400 });
  }
  if (data.mode === "percent" && (data.amount < -50 || data.amount > 200)) {
    return NextResponse.json({ error: "Use a percent between -50 and 200" }, { status: 400 });
  }
  if (data.categoryId && !(await categoryOwned(businessId, data.categoryId))) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
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

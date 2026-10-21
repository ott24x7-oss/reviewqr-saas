import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planOwner, requireBusinessRole } from "@/lib/tenant";
import { ownerLimitError } from "@/lib/entitlements";
import { revalidateBusinessTap } from "@/lib/tap/theme-store";
import { CAFE_TEMPLATE } from "@/lib/tap/cafe-template";
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
    "bulk-price"
  ]),
  id: z.string().optional(),
  kind: z.enum(["item", "category"]).optional(),
  name: z.string().max(80).optional(),
  nameHi: z.string().max(80).optional(),
  priceRupees: z.number().min(0).max(100000).optional(),
  mrpRupees: z.number().min(0).max(100000).nullable().optional(),
  description: z.string().max(200).optional(),
  bestseller: z.boolean().optional(),
  veg: veg.optional(),
  categoryId: z.string().nullable().optional(),
  available: z.boolean().optional(),
  photo: z.string().max(400).optional(),
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
        veg: veg.optional()
      })
    )
    .max(40)
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

  if (data.action === "template") {
    const adding = CAFE_TEMPLATE.reduce((sum, group) => sum + group.items.length, 0);
    const limitError = await ownerLimitError(owner, "storeProducts", count, adding);
    if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
    await prisma.$transaction(async (tx) => {
      for (const [index, group] of CAFE_TEMPLATE.entries()) {
        const category = await tx.menuCategory.create({
          data: { businessId: business.id, name: group.category, nameHi: group.categoryHi, sortOrder: index }
        });
        await tx.menuItem.createMany({
          data: group.items.map((item, itemIndex) => ({
            businessId: business.id,
            categoryId: category.id,
            name: item.name,
            nameHi: item.nameHi,
            pricePaise: item.pricePaise,
            veg: item.veg,
            description: item.description || null,
            bestseller: item.bestseller === true,
            sortOrder: itemIndex
          }))
        });
      }
    });
  } else if (data.action === "category") {
    const name = (data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name the category" }, { status: 400 });
    await prisma.menuCategory.create({
      data: { businessId: business.id, name, nameHi: (data.nameHi || "").trim() || null }
    });
  } else if (data.action === "item") {
    if (data.categoryId && !(await categoryOwned(business.id, data.categoryId))) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    const limitError = await ownerLimitError(owner, "storeProducts", count);
    if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
    const name = (data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name the item" }, { status: 400 });
    await prisma.menuItem.create({
      data: {
        businessId: business.id,
        categoryId: data.categoryId || null,
        name,
        nameHi: (data.nameHi || "").trim() || null,
        pricePaise: Math.round((data.priceRupees || 0) * 100),
        mrpPaise: mrpPaise(data.mrpRupees, data.priceRupees || 0),
        description: (data.description || "").trim() || null,
        bestseller: data.bestseller === true,
        veg: data.veg || "NONE",
        available: data.available !== false,
        photo: (data.photo || "").trim() || null
      }
    });
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
        ...(data.photo !== undefined ? { photo: data.photo.trim() || null } : {})
      }
    });
  } else if (data.action === "items") {
    const rows = data.items || [];
    if (!rows.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
    const limitError = await ownerLimitError(owner, "storeProducts", count, rows.length);
    if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
    await prisma.menuItem.createMany({
      data: rows.map((item, index) => ({
        businessId: business.id,
        name: item.name.trim(),
        pricePaise: Math.round(item.priceRupees * 100),
        veg: item.veg || "NONE",
        sortOrder: count + index
      }))
    });
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
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await revalidateBusinessTap(business.id);
  return NextResponse.json({ ok: true });
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
  if (!label) return NextResponse.json({ error: "Name the option" }, { status: 400 });
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

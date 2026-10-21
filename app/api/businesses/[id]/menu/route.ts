import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planOwner, requireBusinessRole } from "@/lib/tenant";
import { ownerLimitError } from "@/lib/entitlements";
import { revalidateBusinessTap } from "@/lib/tap/theme-store";
import { CAFE_TEMPLATE } from "@/lib/tap/cafe-template";

const veg = z.enum(["VEG", "NON_VEG", "EGG", "NONE"]);
const schema = z.object({
  action: z.enum(["category", "item", "update", "delete", "template", "items"]),
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

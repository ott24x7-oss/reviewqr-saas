import type { Prisma } from "@prisma/client";
import { shopDesignSchema } from "@reviewqr/shared";
import { fail, ok, type ServiceResult } from "@/lib/api/result";
import { requireBusinessAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { PRINT_TEMPLATES } from "@/lib/print/templates";
import { getPaymentsConfig, getShippingConfig } from "@/lib/settings";
import { ensureCatalog } from "./catalog-store";
import { designError, type ShopDesign } from "./design";
import { deliveryEstimate } from "./estimate";
import { gstinError, normalizeGstin } from "./gstin";
import { addressError, sameSupplyState } from "./address";
import { quoteShop, type DiscountOffer } from "./quote";
import { providerForEstimates } from "./shipping-resolve";

type LineInput = { sku: string; qty: number; design?: ShopDesign | null };

function readDesign(value: Prisma.JsonValue | null | undefined): ShopDesign | null {
  const parsed = shopDesignSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function cartFor(userId: string) {
  return prisma.shopCart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { lines: true }
  });
}

async function loadOffer(kind: "coupon" | "referral", code: string | null): Promise<DiscountOffer | null> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;
  if (kind === "coupon") {
    const row = await prisma.shopCoupon.findUnique({ where: { code: normalized } });
    if (!row || (row.maxUses != null && row.usedCount >= row.maxUses)) {
      return { percentOff: null, flatPaise: null, active: false };
    }
    return { percentOff: row.percentOff, flatPaise: row.flatPaise, active: row.active, expiresAt: row.expiresAt };
  }
  const row = await prisma.referralCode.findUnique({ where: { code: normalized } });
  if (!row) return { percentOff: null, flatPaise: null, active: false };
  return { percentOff: row.percentOff, flatPaise: row.flatPaise, active: row.active, expiresAt: row.expiresAt };
}

function productCard(product: {
  slug: string;
  name: string;
  nameHi: string | null;
  description: string;
  descriptionHi: string | null;
  needsNfc: boolean;
  needsDesign: boolean;
  defaultTemplateId: string | null;
  variants: Array<{
    sku: string;
    name: string;
    nameHi: string | null;
    salePaise: number;
    mrpPaise: number;
    gstPercent: number;
    stock: number;
    minQty: number;
    ships: boolean;
    weightGrams: number;
    imageUrl: string | null;
    includedLifetime: boolean;
  }>;
}) {
  const variant = product.variants[0];
  return {
    slug: product.slug,
    name: product.name,
    nameHi: product.nameHi,
    description: product.description,
    descriptionHi: product.descriptionHi,
    needsNfc: product.needsNfc,
    needsDesign: product.needsDesign,
    defaultTemplateId: product.defaultTemplateId,
    fromPaise: variant?.salePaise ?? 0,
    mrpPaise: variant?.mrpPaise ?? 0,
    ships: variant?.ships ?? true,
    // The cover is the first variant photo the admin uploaded; the grid draws a preview when there is none.
    imageUrl: product.variants.find((item) => item.imageUrl)?.imageUrl ?? null,
    variants: product.variants
  };
}

export async function shopCatalog() {
  await ensureCatalog();
  const products = await prisma.catalogProduct.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { variants: { where: { active: true }, orderBy: { salePaise: "asc" } } }
  });
  return products.filter((product) => product.variants.length > 0).map(productCard);
}

export async function shopProduct(slug: string) {
  await ensureCatalog();
  const product = await prisma.catalogProduct.findFirst({
    where: { slug, active: true },
    include: { variants: { where: { active: true }, orderBy: { salePaise: "asc" } } }
  });
  if (!product || product.variants.length === 0) return null;
  return productCard(product);
}

/** Units in the owner's cart, for the shop header badge. */
export async function shopCartCount(userId: string) {
  const cart = await prisma.shopCart.findUnique({ where: { userId }, select: { lines: { select: { qty: true } } } });
  return cart?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0;
}

/** The first business the owner can manage, named on the product previews. */
export async function shopPreviewBusinessName(userId: string) {
  const [first] = await businessesFor(userId);
  return first?.name ?? null;
}

async function businessesFor(userId: string) {
  return prisma.business.findMany({
    where: {
      archived: false,
      OR: [{ ownerId: userId }, { agentId: userId }, { members: { some: { userId } } }]
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function shopCartView(userId: string) {
  const cart = await cartFor(userId);
  const [addresses, businesses, payments] = await Promise.all([
    prisma.shippingAddress.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    businessesFor(userId),
    getPaymentsConfig()
  ]);
  const variantIds = cart.lines.map((line) => line.variantId);
  const variants = variantIds.length
    ? await prisma.catalogVariant.findMany({ where: { id: { in: variantIds } }, include: { product: true } })
    : [];
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const address = addresses.find((row) => row.id === cart.addressId) ?? null;
  const lines = cart.lines.map((line) => {
    const variant = byId.get(line.variantId);
    const design = readDesign(line.design);
    return {
      sku: variant?.sku ?? "",
      name: variant?.name ?? "Removed item",
      nameHi: variant?.nameHi ?? null,
      qty: line.qty,
      unitPaise: variant?.salePaise ?? 0,
      mrpPaise: variant?.mrpPaise ?? 0,
      gstPercent: variant?.gstPercent ?? 18,
      stock: variant?.stock ?? 0,
      minQty: variant?.minQty ?? 1,
      ships: variant?.ships ?? true,
      weightGrams: variant?.weightGrams ?? 0,
      needsDesign: variant?.product.needsDesign ?? false,
      needsNfc: variant?.product.needsNfc ?? false,
      includedLifetime: variant?.includedLifetime ?? false,
      active: Boolean(variant?.active),
      design,
      designError: variant
        ? designError({ needsDesign: variant.product.needsDesign, needsNfc: variant.product.needsNfc }, design)
        : "This item is not for sale"
    };
  });
  const quotable = lines.filter((line) => line.sku && line.active);
  const emptyQuote = { ok: true as const, lines: [], subtotalPaise: 0, couponPaise: 0, referralPaise: 0, couponRejected: false, referralRejected: false, discountPaise: 0, totalPaise: 0, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
  const quote = quotable.length
    ? quoteShop({
        lines: quotable.map((line) => ({
          sku: line.sku,
          qty: line.qty,
          unitPaise: line.unitPaise,
          gstPercent: line.gstPercent,
          stock: line.stock,
          minQty: line.minQty,
          active: line.active,
          includedLifetime: line.includedLifetime
        })),
        coupon: await loadOffer("coupon", cart.couponCode),
        referral: await loadOffer("referral", cart.referralCode),
        sameState: sameSupplyState(address?.state, payments.sellerState)
      })
    : emptyQuote;
  const qrCodes = cart.businessId
    ? await prisma.qRCode.findMany({ where: { businessId: cart.businessId }, select: { shortCode: true, label: true }, orderBy: { label: "asc" } })
    : [];
  const devices = cart.businessId
    ? await prisma.device.findMany({
        where: { businessId: cart.businessId, status: { in: ["ASSIGNED", "ACTIVE", "IN_STOCK"] } },
        select: { id: true, kind: true, chipUid: true },
        orderBy: { createdAt: "asc" }
      })
    : [];
  return {
    businessId: cart.businessId,
    couponCode: cart.couponCode,
    referralCode: cart.referralCode,
    buyerGstin: cart.buyerGstin,
    buyerLegalName: cart.buyerLegalName,
    addressId: cart.addressId,
    lines,
    quote,
    addresses,
    businesses,
    qrCodes,
    devices,
    templates: PRINT_TEMPLATES.map((template) => ({ id: template.id, name: template.name }))
  };
}

async function variantsBySku(skus: string[]) {
  return prisma.catalogVariant.findMany({
    where: { sku: { in: skus }, active: true },
    include: { product: true }
  });
}

async function assertBusiness(userId: string, businessId: string | null | undefined) {
  if (!businessId) return null;
  const access = await requireBusinessAccess(userId, businessId, "manage");
  if (!access) return fail(403, "You cannot use that business");
  return null;
}

async function checkedLines(userId: string, businessId: string | null, lines: LineInput[]): Promise<ServiceResult<Array<{ variantId: string; qty: number; design: ShopDesign | null }>>> {
  const variants = await variantsBySku(lines.map((line) => line.sku));
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const next = [];
  for (const line of lines) {
    const variant = bySku.get(line.sku);
    if (!variant) return fail(400, "This item is not for sale");
    const design = line.design ?? null;
    const problem = designError({ needsDesign: variant.product.needsDesign, needsNfc: variant.product.needsNfc }, design);
    if (design && problem && (design.templateId || design.qrShortCode || design.deviceId)) return fail(400, problem);
    if (design) {
      if (businessId && design.businessId !== businessId) return fail(400, "The design must use the cart business");
      if (design.templateId && designError({ needsDesign: true, needsNfc: false }, { ...design, qrShortCode: design.qrShortCode || "pending" })) {
        return fail(400, "Choose a print template");
      }
      if (design.qrShortCode) {
        const qr = await prisma.qRCode.findFirst({ where: { shortCode: design.qrShortCode, businessId: design.businessId }, select: { id: true } });
        if (!qr) return fail(400, "Choose a QR code from that business");
      }
      if (design.deviceId) {
        const device = await prisma.device.findFirst({ where: { id: design.deviceId, businessId: design.businessId }, select: { id: true } });
        if (!device) return fail(400, "Choose an NFC tag from that business");
      }
      const access = await assertBusiness(userId, design.businessId);
      if (access) return access;
    }
    next.push({ variantId: variant.id, qty: line.qty, design });
  }
  return ok(next);
}

export async function saveShopCart(
  userId: string,
  input: {
    businessId?: string | null;
    couponCode?: string | null;
    referralCode?: string | null;
    buyerGstin?: string | null;
    buyerLegalName?: string | null;
    addressId?: string | null;
    lines?: LineInput[];
  }
) {
  const gstin = normalizeGstin(input.buyerGstin);
  const gstinProblem = gstinError(gstin);
  if (gstinProblem) return fail(400, gstinProblem);
  const businessId = input.businessId || null;
  const access = await assertBusiness(userId, businessId);
  if (access) return access;
  if (input.addressId) {
    const address = await prisma.shippingAddress.findFirst({ where: { id: input.addressId, userId }, select: { id: true } });
    if (!address) return fail(400, "Choose a saved address");
  }
  const prepared = input.lines ? await checkedLines(userId, businessId, input.lines) : null;
  if (prepared && !prepared.ok) return prepared;
  const cart = await cartFor(userId);
  await prisma.$transaction(async (tx) => {
    await tx.shopCart.update({
      where: { id: cart.id },
      data: {
        businessId,
        couponCode: input.couponCode?.trim().toUpperCase() || null,
        referralCode: input.referralCode?.trim().toUpperCase() || null,
        buyerGstin: gstin,
        buyerLegalName: input.buyerLegalName?.trim() || null,
        addressId: input.addressId || null
      }
    });
    if (prepared?.ok) {
      await tx.shopCartLine.deleteMany({ where: { cartId: cart.id } });
      if (prepared.data.length) {
        await tx.shopCartLine.createMany({
          data: prepared.data.map((line) => ({
            cartId: cart.id,
            variantId: line.variantId,
            qty: line.qty,
            design: line.design ? (line.design as Prisma.InputJsonValue) : undefined
          }))
        });
      }
    }
  });
  return ok(await shopCartView(userId));
}

export async function addShopCartItem(userId: string, item: LineInput) {
  const cart = await cartFor(userId);
  const current = await shopCartView(userId);
  const lines = current.lines.filter((line) => line.sku).map((line) => ({ sku: line.sku, qty: line.qty, design: line.design }));
  const existing = lines.find((line) => line.sku === item.sku);
  if (existing) existing.qty += item.qty;
  else lines.push({ sku: item.sku, qty: item.qty, design: item.design ?? null });
  return saveShopCart(userId, {
    businessId: cart.businessId,
    couponCode: cart.couponCode,
    referralCode: cart.referralCode,
    buyerGstin: cart.buyerGstin,
    buyerLegalName: cart.buyerLegalName,
    addressId: cart.addressId,
    lines
  });
}

export async function createShopAddress(
  userId: string,
  input: { label?: string | null; name: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string; isDefault?: boolean }
) {
  const problem = addressError(input);
  if (problem) return fail(400, problem);
  if (input.isDefault) {
    await prisma.shippingAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }
  const address = await prisma.shippingAddress.create({
    data: {
      userId,
      label: input.label?.trim() || null,
      name: input.name.trim(),
      phone: input.phone.replace(/\s+/g, ""),
      line1: input.line1.trim(),
      line2: input.line2?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      isDefault: input.isDefault === true
    }
  });
  return ok(address);
}

export async function deleteShopAddress(userId: string, id: string) {
  const address = await prisma.shippingAddress.findFirst({ where: { id, userId }, select: { id: true } });
  if (!address) return fail(404, "Address not found");
  await prisma.shippingAddress.delete({ where: { id } });
  await prisma.shopCart.updateMany({ where: { userId, addressId: id }, data: { addressId: null } });
  return ok({ deleted: true });
}

export async function estimateShopDelivery(pincode: string, weightGrams: number) {
  const config = await getShippingConfig();
  const provider = providerForEstimates(config, process.env.NODE_ENV);
  return deliveryEstimate(provider, pincode, weightGrams);
}

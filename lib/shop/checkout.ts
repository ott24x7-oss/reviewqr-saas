/**
 * Start a prepaid shop checkout. The charged amount is the quoted order total
 * (or the COD advance). A stub is used only outside production.
 */
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/api/result";
import { requireBusinessAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getPaymentsConfig, getShopCheckoutConfig } from "@/lib/settings";
import { appCartSellsDigital, shopCartView } from "./cart-store";
import { chargeForOrder } from "./charge";
import { hardwareCommissionSnapshot } from "../plans/hardware";
import { fulfillPaidShopOrder } from "./fulfill";
import { confirmStubbedShopOrder, shopStubHonoured } from "./payment-stub";

type EnvLike = { NODE_ENV?: string; SHOP_PAYMENT_STUB?: string };

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function checkoutShop(userId: string, env: EnvLike = process.env, audience: "web" | "app" = "web") {
  const limit = await rateLimitDb({ key: `shop-pay:${userId}`, limit: 8, windowSeconds: 3600 });
  if (!limit.ok) return fail(429, "Too many payment attempts. Please wait.");
  if (audience === "app" && (await appCartSellsDigital(userId))) return fail(400, "This item is not sold in the app");

  const view = await shopCartView(userId, audience);
  if (!view.lines.length) return fail(400, "Add at least one item");
  if (view.lines.some((line) => !line.active || !line.sku)) return fail(400, "This item is not for sale");
  if (view.lines.some((line) => line.unbranded) && !view.businessId) return fail(400, "Choose the business for this unbranded order");
  const designProblem = view.lines.find((line) => line.designError);
  if (designProblem?.designError) return fail(400, designProblem.designError);
  if (!view.quote.ok) return fail(400, view.quote.error);
  if (view.couponCode && view.quote.couponRejected) return fail(400, "That coupon cannot be used");
  if (view.referralCode && view.quote.referralRejected) return fail(400, "That referral code cannot be used");
  if (view.lines.some((line) => line.ships) && !view.addressId) return fail(400, "Choose a shipping address");
  if (view.businessId) {
    const access = await requireBusinessAccess(userId, view.businessId, "manage");
    if (!access) return fail(403, "You cannot use that business");
  }

  const [payments, shopConfig, variants] = await Promise.all([
    getPaymentsConfig(),
    getShopCheckoutConfig(),
    prisma.catalogVariant.findMany({
      where: { sku: { in: view.lines.map((line) => line.sku) } },
      include: { product: true }
    })
  ]);
  const charge = chargeForOrder(view.quote.totalPaise, shopConfig);
  const business = view.businessId
    ? await prisma.business.findUnique({ where: { id: view.businessId }, select: { agentId: true } })
    : null;
  const agentId = business?.agentId || null;
  const orderTotal = view.quote.ok ? view.quote.totalPaise : 0;
  const hardware = agentId
    ? await hardwareCommissionSnapshot(agentId, orderTotal, shopConfig.commissionPercent)
    : { percent: null as number | null, paise: 0, basis: "PERCENT" as const, flatPaise: 0 };
  const commissionAmount = hardware.paise;
  const address = view.addresses.find((row) => row.id === view.addressId) ?? null;
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const quoted = new Map(view.quote.lines.map((line) => [line.sku, line]));
  const snapshot: Array<{
    variant: (typeof variants)[number];
    line: (typeof view.lines)[number];
    money: (typeof view.quote.lines)[number];
    addonMoney?: (typeof view.quote.lines)[number];
  }> = [];
  for (const line of view.lines) {
    const variant = bySku.get(line.sku);
    const money = quoted.get(line.sku);
    if (!variant || !money) return fail(400, "This item is not for sale");
    const addonMoney = line.unbranded ? quoted.get(`${line.sku}::UNBRANDED`) : undefined;
    if (line.unbranded && !addonMoney) return fail(400, "Could not quote the unbranded add-on");
    snapshot.push({ variant, line, money, addonMoney });
  }

  const fingerprint = JSON.stringify({
    businessId: view.businessId,
    couponCode: view.couponCode,
    referralCode: view.referralCode,
    buyerGstin: view.buyerGstin,
    buyerLegalName: view.buyerLegalName,
    addressId: view.addressId,
    totalPaise: view.quote.totalPaise,
    advancePaise: charge.advancePaise,
    lines: snapshot.map(({ line }) => ({ sku: line.sku, qty: line.qty, design: line.design, unbranded: line.unbranded }))
  });

  const pending = await prisma.shopOrder.findFirst({
    where: { userId, paymentStatus: "PENDING", status: "PENDING_PAYMENT", fingerprint },
    orderBy: { createdAt: "desc" }
  });

  async function createOrder() {
    await prisma.shopOrder.updateMany({
      where: { userId, paymentStatus: "PENDING", status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", paymentStatus: "FAILED" }
    });
    return prisma.shopOrder.create({
      data: {
        userId,
        businessId: view.businessId,
        agentId,
        commissionPercent: agentId ? hardware.percent : null,
        commissionPaise: commissionAmount,
        subtotalPaise: view.quote.ok ? view.quote.subtotalPaise : 0,
        discountPaise: view.quote.ok ? view.quote.discountPaise : 0,
        totalPaise: view.quote.ok ? view.quote.totalPaise : 0,
        taxablePaise: view.quote.ok ? view.quote.taxablePaise : 0,
        cgstPaise: view.quote.ok ? view.quote.cgstPaise : 0,
        sgstPaise: view.quote.ok ? view.quote.sgstPaise : 0,
        igstPaise: view.quote.ok ? view.quote.igstPaise : 0,
        advancePaise: charge.advancePaise,
        balancePaise: charge.balancePaise,
        cod: charge.cod,
        couponCode: view.couponCode?.trim().toUpperCase() || null,
        referralCode: view.referralCode?.trim().toUpperCase() || null,
        buyerGstin: view.buyerGstin,
        buyerLegalName: view.buyerLegalName,
        buyerState: address?.state || null,
        sellerName: payments.sellerLegalName || "QR24x7",
        sellerGstin: payments.sellerGstin || "",
        sellerState: payments.sellerState || "",
        addressJson: address
          ? jsonValue({
              name: address.name,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              pincode: address.pincode
            })
          : undefined,
        fingerprint,
        expiresAt: payments.upiGateway === "manual" ? new Date(Date.now() + 15 * 60_000) : null,
        lines: {
          create: snapshot.flatMap(({ variant, line, money, addonMoney }) => [{
            variantId: variant.id,
            sku: variant.sku,
            name: variant.name,
            qty: line.qty,
            unbranded: line.unbranded,
            unitPaise: variant.salePaise,
            hsn: variant.hsn,
            gstPercent: variant.gstPercent,
            discountPaise: money.discountPaise,
            netPaise: money.netPaise,
            taxablePaise: money.taxablePaise,
            cgstPaise: money.cgstPaise,
            sgstPaise: money.sgstPaise,
            igstPaise: money.igstPaise,
            ships: variant.ships,
            needsDesign: variant.product.needsDesign,
            needsNfc: variant.product.needsNfc,
            weightGrams: variant.weightGrams,
            includedTier: variant.includedTier,
            includedMonths: variant.includedMonths,
            includedLifetime: variant.includedLifetime,
            design: jsonValue(line.design)
          }, ...(addonMoney ? [{
            variantId: null,
            sku: `${variant.sku}-UNBRANDED`,
            name: "Unbranded add-on",
            qty: line.qty,
            unitPaise: shopConfig.unbrandedAddonPaise,
            hsn: variant.hsn,
            gstPercent: variant.gstPercent,
            discountPaise: addonMoney.discountPaise,
            netPaise: addonMoney.netPaise,
            taxablePaise: addonMoney.taxablePaise,
            cgstPaise: addonMoney.cgstPaise,
            sgstPaise: addonMoney.sgstPaise,
            igstPaise: addonMoney.igstPaise,
            ships: false,
            needsDesign: false,
            needsNfc: false,
            weightGrams: 0,
            includedTier: null,
            includedMonths: null,
            includedLifetime: false,
            unbranded: true
          }] : [])])
        }
      }
    });
  }

  async function startPayment(orderId: string, advancePaise: number, checkoutUrl: string | null) {
    if (advancePaise === 0) {
      const settled = await fulfillPaidShopOrder({
        orderId,
        verifiedVia: "free",
        expectedAmountPaise: 0
      });
      if (!settled.ok) return fail(409, settled.error);
      return ok({ orderId, paid: true, checkoutUrl: null as string | null, invoiceNumber: settled.invoiceNumber });
    }

    // Production ignores SHOP_PAYMENT_STUB; it refuses to run when NODE_ENV is production.
    if (shopStubHonoured(env)) {
      const settled = await confirmStubbedShopOrder(orderId, {
        env,
        fulfill: async (id) => {
          const row = await prisma.shopOrder.findUnique({ where: { id }, select: { advancePaise: true } });
          if (!row) return { ok: false, error: "Order not found" };
          return fulfillPaidShopOrder({
            orderId: id,
            verifiedVia: "stub",
            expectedAmountPaise: row.advancePaise
          });
        }
      });
      if (!settled.ok) return fail(400, settled.error);
      return ok({ orderId, paid: true, checkoutUrl: null, invoiceNumber: settled.invoiceNumber });
    }

    // Reuse a checkout session created before YouPI was removed.
    if (checkoutUrl) return ok({ orderId, paid: false, checkoutUrl, invoiceNumber: null });

    if (payments.upiGateway === "manual") {
      if (!payments.upiEnabled || !payments.upiId) return fail(400, "Manual UPI checkout is not available right now.");
      const expiresAt = new Date(Date.now() + 15 * 60_000);
      await prisma.shopOrder.update({ where: { id: orderId }, data: { expiresAt } });
      return ok({ orderId, paid: false, checkoutUrl: null, invoiceNumber: null, expiresAt: expiresAt.toISOString() });
    }
    if (payments.upiGateway === "razorpay") return fail(400, "Razorpay is not configured for shop checkout.");

    return fail(400, "No supported shop payment method is available right now.");
  }

  const order = pending ?? (await createOrder());
  return startPayment(order.id, order.advancePaise, order.checkoutUrl);
}

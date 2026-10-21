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
import { absoluteUrl } from "@/lib/utils";
import { getYoupiConfig, youpiConfigured, youpiCreatePayment } from "@/lib/payments/youpi";
import { shopCartView } from "./cart-store";
import { chargeForOrder } from "./charge";
import { commissionPaise } from "./commission";
import { fulfillPaidShopOrder } from "./fulfill";
import { confirmStubbedShopOrder, shopStubHonoured } from "./payment-stub";

type EnvLike = { NODE_ENV?: string; SHOP_PAYMENT_STUB?: string };

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function checkoutShop(userId: string, env: EnvLike = process.env) {
  const limit = await rateLimitDb({ key: `shop-pay:${userId}`, limit: 8, windowSeconds: 3600 });
  if (!limit.ok) return fail(429, "Too many payment attempts. Please wait.");

  const view = await shopCartView(userId);
  if (!view.lines.length) return fail(400, "Add at least one item");
  if (view.lines.some((line) => !line.active || !line.sku)) return fail(400, "This item is not for sale");
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
  const commissionAmount = agentId ? commissionPaise(orderTotal, shopConfig.commissionPercent) : 0;
  const address = view.addresses.find((row) => row.id === view.addressId) ?? null;
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const quoted = new Map(view.quote.lines.map((line) => [line.sku, line]));
  const snapshot: Array<{
    variant: (typeof variants)[number];
    line: (typeof view.lines)[number];
    money: (typeof view.quote.lines)[number];
  }> = [];
  for (const line of view.lines) {
    const variant = bySku.get(line.sku);
    const money = quoted.get(line.sku);
    if (!variant || !money) return fail(400, "This item is not for sale");
    snapshot.push({ variant, line, money });
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
    lines: snapshot.map(({ line }) => ({ sku: line.sku, qty: line.qty, design: line.design }))
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
        commissionPercent: agentId ? shopConfig.commissionPercent : null,
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
        sellerName: payments.sellerLegalName || "ReviewQR",
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
        lines: {
          create: snapshot.map(({ variant, line, money }) => ({
            variantId: variant.id,
            sku: variant.sku,
            name: variant.name,
            qty: line.qty,
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
          }))
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

    // Production ignores SHOP_PAYMENT_STUB. The stub path is the only one that
    // can confirm without YouPI, and it refuses to run when NODE_ENV is production.
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

    if (checkoutUrl) {
      return ok({ orderId, paid: false, checkoutUrl, invoiceNumber: null });
    }

    const cfg = await getYoupiConfig();
    if (!youpiConfigured(cfg)) return fail(400, "UPI checkout is not available right now.");
    try {
      const remote = await youpiCreatePayment({
        orderId,
        amountPaise: advancePaise,
        returnUrl: absoluteUrl(`/dashboard/shop/orders/${orderId}`),
        idempotencyKey: orderId
      });
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
          providerPaymentId: remote.paymentId || undefined,
          checkoutUrl: remote.checkoutUrl || undefined
        }
      });
      return ok({
        orderId,
        paid: false,
        checkoutUrl: remote.checkoutUrl || null,
        invoiceNumber: null
      });
    } catch (error) {
      await prisma.shopOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED", paymentStatus: "FAILED" }
      });
      const message = error instanceof Error ? error.message : "Could not start payment";
      return fail(502, message);
    }
  }

  const order = pending ?? (await createOrder());
  return startPayment(order.id, order.advancePaise, order.checkoutUrl);
}

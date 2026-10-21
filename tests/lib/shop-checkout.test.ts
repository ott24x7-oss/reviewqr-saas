import crypto from "crypto";
import { describe, expect, it, vi } from "vitest";
import { verifyYoupiWebhook } from "../../lib/payments/youpi";
import { chargeForOrder, shopCheckoutError } from "../../lib/shop/charge";
import { moveAllowed, moveError, ndrKeepsStatus } from "../../lib/shop/order-status";
import { confirmStubbedShopOrder, shopStubHonoured, warnShopPaymentStubInProduction } from "../../lib/shop/payment-stub";
import { shopWebhookAction } from "../../lib/shop/webhook-action";

const owner = { actor: "owner" as const, anyLineNeedsNfc: true, reprintApproved: false };
const admin = { actor: "admin" as const, anyLineNeedsNfc: false, reprintApproved: false };
const adminNfc = { actor: "admin" as const, anyLineNeedsNfc: true, reprintApproved: false };

describe("shop payment stub", () => {
  it("rejects a stubbed confirmation in production and does not issue an invoice number", async () => {
    const nextInvoiceNumber = vi.fn(async () => "INV-2026-27-0001");
    const fulfill = vi.fn(async () => {
      await nextInvoiceNumber();
      return { ok: true as const, already: false, invoiceNumber: "INV-2026-27-0001" };
    });
    const result = await confirmStubbedShopOrder("order_1", {
      env: { NODE_ENV: "production", SHOP_PAYMENT_STUB: "1" },
      nextInvoiceNumber,
      fulfill
    });
    expect(result).toEqual({ ok: false, error: "Stubbed payment is not available" });
    expect(shopStubHonoured({ NODE_ENV: "production", SHOP_PAYMENT_STUB: "1" })).toBe(false);
    expect(nextInvoiceNumber).not.toHaveBeenCalled();
    expect(fulfill).not.toHaveBeenCalled();
  });

  it("ignores an empty flag and honours a set flag only outside production", async () => {
    expect(shopStubHonoured({ NODE_ENV: "development", SHOP_PAYMENT_STUB: "" })).toBe(false);
    expect(shopStubHonoured({ NODE_ENV: "test" })).toBe(false);
    expect(shopStubHonoured({ NODE_ENV: "development", SHOP_PAYMENT_STUB: "1" })).toBe(true);
    const nextInvoiceNumber = vi.fn(async () => "INV-2026-27-0002");
    const fulfill = vi.fn(async () => {
      await nextInvoiceNumber();
      return { ok: true as const, already: false, invoiceNumber: "INV-2026-27-0002" };
    });
    const result = await confirmStubbedShopOrder("order_2", {
      env: { NODE_ENV: "development", SHOP_PAYMENT_STUB: "1" },
      nextInvoiceNumber,
      fulfill
    });
    expect(result.ok).toBe(true);
    expect(fulfill).toHaveBeenCalledWith("order_2");
    expect(nextInvoiceNumber).toHaveBeenCalledTimes(1);
  });

  it("warns at startup only when the flag is set in production", () => {
    const warn = vi.fn();
    warnShopPaymentStubInProduction({ NODE_ENV: "production", SHOP_PAYMENT_STUB: "1" }, warn);
    warnShopPaymentStubInProduction({ NODE_ENV: "production" }, warn);
    warnShopPaymentStubInProduction({ NODE_ENV: "development", SHOP_PAYMENT_STUB: "1" }, warn);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[shop] SHOP_PAYMENT_STUB is set but ignored because NODE_ENV is production");
  });
});

describe("shop checkout amount", () => {
  it("charges the catalogue total, not a plan price, unless COD takes an advance", () => {
    expect(chargeForOrder(149900, { codEnabled: false, codAdvancePercent: 40 })).toEqual({
      advancePaise: 149900,
      balancePaise: 0,
      cod: false
    });
    expect(chargeForOrder(2499900, { codEnabled: true, codAdvancePercent: 100 })).toEqual({
      advancePaise: 2499900,
      balancePaise: 0,
      cod: false
    });
    expect(chargeForOrder(10001, { codEnabled: true, codAdvancePercent: 50 })).toEqual({
      advancePaise: 5001,
      balancePaise: 5000,
      cod: true
    });
    expect(chargeForOrder(200, { codEnabled: true, codAdvancePercent: 1 })).toEqual({
      advancePaise: 100,
      balancePaise: 100,
      cod: true
    });
    expect(shopCheckoutError({ codEnabled: true, codAdvancePercent: 0 })).toMatch(/percent/i);
  });
});

describe("shop order moves", () => {
  it("allows the production steps and rejects skips", () => {
    expect(moveAllowed("PAID", "PROOF_SENT", admin)).toBe(true);
    expect(moveAllowed("PROOF_SENT", "APPROVED", owner)).toBe(true);
    expect(moveAllowed("PROOF_SENT", "CHANGES_REQUESTED", { ...owner, comment: "Make the name larger" })).toBe(true);
    expect(moveAllowed("APPROVED", "PRINTING", admin)).toBe(true);
    expect(moveAllowed("PRINTING", "PACKED", admin)).toBe(true);
    expect(moveAllowed("PRINTING", "NFC_WRITTEN", adminNfc)).toBe(true);
    expect(moveAllowed("NFC_WRITTEN", "PACKED", adminNfc)).toBe(true);
    expect(moveAllowed("SHIPPED", "DELIVERED", admin)).toBe(true);
    expect(moveAllowed("SHIPPED", "RTO", admin)).toBe(true);
    expect(moveAllowed("RTO", "REPRINT", admin)).toBe(true);
    expect(moveAllowed("REPRINT", "PRINTING", admin)).toBe(true);
    expect(moveAllowed("DELIVERED", "REPRINT", { ...admin, reprintApproved: true })).toBe(true);

    expect(moveAllowed("PAID", "PRINTING", admin)).toBe(false);
    expect(moveAllowed("PAID", "CANCELLED", owner)).toBe(false);
    expect(moveAllowed("PRINTING", "PACKED", adminNfc)).toBe(false);
    expect(moveAllowed("PRINTING", "NFC_WRITTEN", admin)).toBe(false);
    expect(moveAllowed("SHIPPED", "CANCELLED", admin)).toBe(false);
    expect(moveAllowed("PROOF_SENT", "CHANGES_REQUESTED", owner)).toBe(false);
    expect(moveAllowed("DELIVERED", "REPRINT", admin)).toBe(false);
    expect(moveError("DELIVERED", "REPRINT", admin)).toMatch(/damage or misprint/i);
    expect(moveError("PROOF_SENT", "CHANGES_REQUESTED", owner)).toMatch(/comment/i);
  });

  it("records a failed delivery attempt without changing Shipped", () => {
    expect(ndrKeepsStatus("SHIPPED")).toEqual({ ok: true, status: "SHIPPED" });
    expect(ndrKeepsStatus("PACKED").ok).toBe(false);
  });
});

describe("shop webhook gate", () => {
  it("rejects a bad signature before a shop order can be fulfilled", () => {
    const secret = "shop-secret";
    const raw = JSON.stringify({ orderId: "shop_1", paymentId: "pay_1" });
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const bad = verifyYoupiWebhook({
      rawBody: raw,
      signature: `${signature}00`,
      timestamp: String(Date.now()),
      secret
    });
    expect(bad.ok).toBe(false);
    const action = bad.ok
      ? shopWebhookAction({ deliverySeen: false, matchesOrder: true, amountMatches: true, confirmed: true, failed: false })
      : { action: "reject" as const };
    expect(action.action).not.toBe("fulfill");
  });

  it("ignores a repeated delivery and an amount mismatch", () => {
    expect(shopWebhookAction({
      deliverySeen: true,
      matchesOrder: true,
      amountMatches: true,
      confirmed: true,
      failed: false
    }).action).toBe("duplicate");
    const mismatch = shopWebhookAction({
      deliverySeen: false,
      matchesOrder: true,
      amountMatches: false,
      confirmed: true,
      failed: false
    });
    expect(mismatch).toEqual({ action: "reject", error: "Amount mismatch" });
    expect(shopWebhookAction({
      deliverySeen: false,
      matchesOrder: false,
      amountMatches: true,
      confirmed: true,
      failed: false
    })).toEqual({ action: "reject", error: "Order mismatch" });
  });

  it("waits until the payment is settled, then fulfills or fails once", () => {
    expect(shopWebhookAction({
      deliverySeen: false,
      matchesOrder: true,
      amountMatches: true,
      confirmed: false,
      failed: false
    }).action).toBe("wait");
    expect(shopWebhookAction({
      deliverySeen: false,
      matchesOrder: true,
      amountMatches: true,
      confirmed: true,
      failed: false
    }).action).toBe("fulfill");
    expect(shopWebhookAction({
      deliverySeen: false,
      matchesOrder: true,
      amountMatches: true,
      confirmed: false,
      failed: true
    }).action).toBe("fail");
  });
});

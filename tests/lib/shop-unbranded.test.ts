import { beforeEach, describe, expect, it, vi } from "vitest";
import { shopCartLineSchema } from "../../packages/shared/src/shop";
import { quoteShop } from "../../lib/shop/quote";

const settlementMocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  logAudit: vi.fn(),
  getPlanProgramSettings: vi.fn(async () => ({ commissionHoldDays: 0 }))
}));

vi.mock("../../lib/db", () => ({ prisma: settlementMocks.prisma }));
vi.mock("../../lib/admin", () => ({ logAudit: settlementMocks.logAudit }));
vi.mock("../../lib/plans/settings", () => ({ getPlanProgramSettings: settlementMocks.getPlanProgramSettings }));

describe("unbranded shop quotes", () => {
  it("quotes the add-on separately with the product GST and totals the lines", () => {
    const quote = quoteShop({
      lines: [{ sku: "stand", qty: 2, unitPaise: 50000, gstPercent: 18, stock: 10, minQty: 1, unbranded: true, unbrandedUnitPaise: 9900 }],
      sameState: true
    });

    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.lines.map((line) => [line.sku, line.grossPaise, line.gstPercent, line.unbranded])).toEqual([
      ["stand", 100000, 18, false],
      ["stand::UNBRANDED", 19800, 18, true]
    ]);
    expect(quote.subtotalPaise).toBe(119800);
    expect(quote.totalPaise).toBe(quote.lines.reduce((sum, line) => sum + line.netPaise, 0));
    expect(quote.taxablePaise).toBe(quote.lines.reduce((sum, line) => sum + line.taxablePaise, 0));
    expect(quote.cgstPaise).toBe(quote.lines.reduce((sum, line) => sum + line.cgstPaise, 0));
    expect(quote.sgstPaise).toBe(quote.lines.reduce((sum, line) => sum + line.sgstPaise, 0));
    expect(quote.igstPaise).toBe(0);
    expect(quote.lines[1].cgstPaise).toBeGreaterThan(0);
    expect(quote.lines[1].sgstPaise).toBeGreaterThan(0);
  });

  it("discards client supplied prices and uses the server add-on price", () => {
    const clientLine = shopCartLineSchema.parse({ sku: "stand", qty: 1, unbranded: true, unitPaise: 1, unbrandedUnitPaise: 1 });
    expect(clientLine).toEqual({ sku: "stand", qty: 1, unbranded: true });

    const quote = quoteShop({
      lines: [{ ...clientLine, sku: clientLine.sku, qty: clientLine.qty, unitPaise: 50000, gstPercent: 18, stock: 5, minQty: 1, unbrandedUnitPaise: 9900 }],
      sameState: true
    });
    expect(quote.ok).toBe(true);
    if (quote.ok) expect(quote.lines.find((line) => line.unbranded)?.grossPaise).toBe(9900);
  });
});

describe("unbranded settlement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("enables branding once on payment, including webhook replay, only for the order business", async () => {
    const orders = new Map<string, any>([
      ["order-a", { id: "order-a", status: "PENDING_PAYMENT", paymentStatus: "PENDING", advancePaise: 9900, invoiceNumber: null, userId: "buyer-a", businessId: "business-a", couponCode: null, providerPaymentId: null, agentId: null, commissionPercent: null, commissionPaise: 0 }],
      ["order-b", { id: "order-b", status: "PENDING_PAYMENT", paymentStatus: "PENDING", advancePaise: 50000, invoiceNumber: null, userId: "buyer-b", businessId: "business-b", couponCode: null, providerPaymentId: null, agentId: null, commissionPercent: null, commissionPaise: 0 }]
    ]);
    const lines = new Map<string, any[]>([
      ["order-a", [{ orderId: "order-a", qty: 1, variantId: null, unbranded: true, includedTier: null, includedMonths: null, includedLifetime: false }]],
      ["order-b", [{ orderId: "order-b", qty: 1, variantId: "variant-b", unbranded: false, includedTier: null, includedMonths: null, includedLifetime: false }]]
    ]);
    const brandingWrites: any[] = [];
    const tx: any = {
      $queryRaw: vi.fn(async (parts: TemplateStringsArray, ...values: unknown[]) => {
        const sql = parts.join("?");
        if (sql.includes('FROM "ShopOrder"')) return [orders.get(String(values[0]))];
        if (sql.includes('FROM "User"')) return [{ id: String(values[0]), subscriptionTier: "FREE", subscriptionEndsAt: null }];
        if (sql.includes('FROM "CatalogVariant"')) return [{ stock: 10 }];
        return [];
      }),
      shopOrderLine: { findMany: vi.fn(async ({ where }: any) => lines.get(where.orderId) ?? []) },
      shopOrder: {
        findFirst: vi.fn(async () => null),
        update: vi.fn(async ({ where, data }: any) => {
          const order = orders.get(where.id);
          Object.assign(order, data);
          return order;
        })
      },
      business: {
        updateMany: vi.fn(async (args: any) => { brandingWrites.push(args); return { count: 1 }; }),
        findUnique: vi.fn(async ({ where }: any) => ({ ownerId: `owner-${where.id}` }))
      },
      catalogVariant: { update: vi.fn(async () => ({})) },
      shopCartLine: { deleteMany: vi.fn(async () => ({})) },
      shopCart: { updateMany: vi.fn(async () => ({})) }
    };
    settlementMocks.prisma.$transaction.mockImplementation(async (callback: (client: any) => unknown) => callback(tx));

    const { fulfillPaidShopOrder } = await import("../../lib/shop/fulfill");
    const issueInvoice = vi.fn(async () => "INV-TEST-1");
    const paid = await fulfillPaidShopOrder({ orderId: "order-a", verifiedVia: "TEST", nextInvoiceNumber: issueInvoice });
    const replay = await fulfillPaidShopOrder({ orderId: "order-a", verifiedVia: "TEST", nextInvoiceNumber: issueInvoice });
    const otherBusiness = await fulfillPaidShopOrder({ orderId: "order-b", verifiedVia: "TEST", nextInvoiceNumber: issueInvoice });

    expect(paid).toMatchObject({ ok: true, already: false });
    expect(replay).toMatchObject({ ok: true, already: true });
    expect(otherBusiness).toMatchObject({ ok: true, already: false });
    expect(brandingWrites).toHaveLength(1);
    expect(brandingWrites[0]).toMatchObject({ where: { id: "business-a" }, data: { hideBranding: true, hideBrandingSource: "PURCHASE" } });
    expect(issueInvoice).toHaveBeenCalledTimes(2);
  });
});

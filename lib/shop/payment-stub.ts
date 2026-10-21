/**
 * SHOP_PAYMENT_STUB is a local checkout stand-in. It is ignored whenever
 * NODE_ENV is production, even if the variable is present. A rejected stub
 * must not issue an invoice number.
 */

type EnvLike = { NODE_ENV?: string; SHOP_PAYMENT_STUB?: string };

export type StubConfirmResult =
  | { ok: true; already: boolean; invoiceNumber: string | null }
  | { ok: false; error: string };

function flagSet(value: string | undefined) {
  return typeof value === "string" && value.length > 0;
}

export function shopStubHonoured(env: EnvLike = process.env) {
  if (env.NODE_ENV === "production") return false;
  return flagSet(env.SHOP_PAYMENT_STUB);
}

export function warnShopPaymentStubInProduction(
  env: EnvLike = process.env,
  warn: (message: string) => void = console.warn
) {
  if (env.NODE_ENV === "production" && flagSet(env.SHOP_PAYMENT_STUB)) {
    warn("[shop] SHOP_PAYMENT_STUB is set but ignored because NODE_ENV is production");
  }
}

export async function confirmStubbedShopOrder(
  orderId: string,
  deps: {
    env?: EnvLike;
    nextInvoiceNumber?: () => Promise<string>;
    fulfill?: (orderId: string) => Promise<StubConfirmResult>;
  } = {}
): Promise<StubConfirmResult> {
  const env = deps.env ?? process.env;
  if (!shopStubHonoured(env) || !deps.fulfill) {
    return { ok: false, error: "Stubbed payment is not available" };
  }
  return deps.fulfill(orderId);
}

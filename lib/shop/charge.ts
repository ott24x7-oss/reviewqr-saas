/** What YouPI collects for one shop order. Prices stay GST-inclusive paise. */

export type ShopCheckoutConfig = {
  codEnabled: boolean;
  /** 100 means fully prepaid. A lower percent is the advance when COD is on. */
  codAdvancePercent: number;
  /** Snapshotted onto a shop order. A renewal uses the current value. */
  commissionPercent: number;
};

export const DEFAULT_SHOP_CHECKOUT: ShopCheckoutConfig = {
  codEnabled: false,
  codAdvancePercent: 100,
  commissionPercent: 10
};

export function normalizeShopCheckout(input: Partial<ShopCheckoutConfig> | null | undefined): ShopCheckoutConfig {
  const percent = Math.floor(Number(input?.codAdvancePercent));
  const commission = Math.floor(Number(input?.commissionPercent));
  return {
    codEnabled: input?.codEnabled === true,
    codAdvancePercent: Number.isInteger(percent) && percent >= 1 && percent <= 100 ? percent : 100,
    commissionPercent: Number.isInteger(commission) && commission >= 0 && commission <= 100 ? commission : 10
  };
}

export function shopCheckoutError(input: ShopCheckoutConfig): string | null {
  if (!Number.isInteger(input.codAdvancePercent) || input.codAdvancePercent < 1 || input.codAdvancePercent > 100) {
    return "COD advance must be a whole percent from 1 to 100";
  }
  if (!Number.isInteger(input.commissionPercent) || input.commissionPercent < 0 || input.commissionPercent > 100) {
    return "Commission must be a whole percent from 0 to 100";
  }
  return null;
}

/**
 * COD off, or a 100 percent advance, charges the order total.
 * The total is the catalogue sale price after coupons. It is not a plan list price.
 */
export function chargeForOrder(totalPaise: number, config: ShopCheckoutConfig) {
  const total = Math.max(0, Math.floor(totalPaise));
  const partial = config.codEnabled === true && config.codAdvancePercent < 100;
  if (!partial) return { advancePaise: total, balancePaise: 0, cod: false };
  let advance = Math.round((total * config.codAdvancePercent) / 100);
  if (total >= 100 && advance < 100) advance = 100;
  if (advance > total) advance = total;
  if (advance < 0) advance = 0;
  return { advancePaise: advance, balancePaise: total - advance, cod: advance < total };
}

export type SellableVariant = {
  id: string;
  label: string;
  labelHi?: string | null;
  size: string;
  colour: string;
  pricePaise: number;
  inStock: boolean;
};

export type SellableAddOn = {
  id: string;
  name: string;
  nameHi?: string | null;
  pricePaise: number;
  inStock: boolean;
};

export function usesSizeColour(variants: SellableVariant[]) {
  return variants.some((variant) => variant.size.trim() && variant.colour.trim());
}

export function uniqueLabels(variants: SellableVariant[], key: "size" | "colour") {
  const labels: string[] = [];
  for (const variant of variants) {
    const value = variant[key].trim();
    if (value && !labels.includes(value)) labels.push(value);
  }
  return labels;
}

export function matchVariant(variants: SellableVariant[], size: string, colour: string) {
  return variants.find((variant) => variant.size.trim() === size && variant.colour.trim() === colour) || null;
}

export function lineUnitPaise(itemPricePaise: number, variant: { pricePaise: number } | null, addOns: { pricePaise: number }[]) {
  const base = variant ? variant.pricePaise : itemPricePaise;
  return Math.max(0, Math.round(base)) + addOns.reduce((sum, addOn) => sum + Math.max(0, Math.round(addOn.pricePaise)), 0);
}

/** WhatsApp line text. The variant and add-ons stay inside the existing item name. */
export function optionLineName(name: string, variantLabel: string, addonNames: string[]) {
  const variant = variantLabel.trim();
  const extras = addonNames.map((entry) => entry.trim()).filter(Boolean);
  const base = variant ? `${name} (${variant})` : name;
  return extras.length ? `${base} + ${extras.join(", ")}` : base;
}

export function resolveChoice(input: {
  itemPricePaise: number;
  variants: SellableVariant[];
  addOns: SellableAddOn[];
  variantId?: string | null;
  addonIds?: string[];
}):
  | { ok: true; unitPaise: number; variant: SellableVariant | null; addOns: SellableAddOn[] }
  | { ok: false; code: "choose" | "missing" | "stock" } {
  const variantId = (input.variantId || "").trim();
  let variant: SellableVariant | null = null;
  if (input.variants.length > 0) {
    if (!variantId) return { ok: false, code: "choose" };
    variant = input.variants.find((row) => row.id === variantId) || null;
    if (!variant) return { ok: false, code: "missing" };
    if (!variant.inStock) return { ok: false, code: "stock" };
  } else if (variantId) {
    return { ok: false, code: "missing" };
  }

  const wanted = [...new Set((input.addonIds || []).map((id) => id.trim()).filter(Boolean))];
  const chosen: SellableAddOn[] = [];
  for (const id of wanted) {
    const addOn = input.addOns.find((row) => row.id === id);
    if (!addOn) return { ok: false, code: "missing" };
    if (!addOn.inStock) return { ok: false, code: "stock" };
    chosen.push(addOn);
  }
  return {
    ok: true,
    unitPaise: lineUnitPaise(input.itemPricePaise, variant, chosen),
    variant,
    addOns: chosen
  };
}

/** Percent or rupee change. Prices never go below zero. */
export function adjustedPricePaise(pricePaise: number, mode: "percent" | "rupees", amount: number) {
  const current = Math.max(0, Math.round(pricePaise));
  const next = mode === "percent"
    ? Math.round(current * (1 + amount / 100))
    : current + Math.round(amount * 100);
  return Math.max(0, next);
}

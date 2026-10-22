/** Shop grid card helpers. Prices stay server-computed; these only read them. */

export type ShopArtKind = "stand" | "combo" | "card" | "sticker" | "keychain" | "tent" | "plan";

export function offPercent(mrpPaise: number, salePaise: number) {
  if (mrpPaise <= 0 || mrpPaise <= salePaise) return 0;
  return Math.round(((mrpPaise - salePaise) / mrpPaise) * 100);
}

/** A product with more than one variant opens the Choose sheet; the rest add straight from the card. */
export function hasOptions(product: { variants: unknown[] }) {
  return product.variants.length > 1;
}

/** Which illustrated preview to draw until an admin uploads a photo. */
export function artKind(product: { needsDesign: boolean; needsNfc: boolean; ships: boolean; defaultTemplateId: string | null }): ShopArtKind {
  if (!product.ships || !product.needsDesign) return "plan";
  const template = product.defaultTemplateId ?? "";
  if (template === "cr80") return "card";
  if (template === "keychain") return "keychain";
  if (template.startsWith("square-") || template.startsWith("round-") || template.includes("sticker")) return "sticker";
  if (template.startsWith("tent-") || template.includes("tent")) return "tent";
  return product.needsNfc ? "combo" : "stand";
}

/** Units in a cart view, for the header badge after an add. */
export function cartUnits(lines: Array<{ qty: number }>) {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

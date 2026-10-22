import { loadEntitlement } from "../plans/entitlements";

/** The public tap page shows the catalogue when the owner has Menu or Store. */
export async function publicCatalogue(ownerId: string) {
  const entitlement = await loadEntitlement(ownerId);
  return {
    showCatalogue: entitlement.modules.includes("MENU") || entitlement.modules.includes("STORE"),
    canOrder: entitlement.modules.includes("STORE")
  };
}

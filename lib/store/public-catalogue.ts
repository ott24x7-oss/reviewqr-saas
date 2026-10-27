import { featureBlock } from "../plans/feature-gate";
import { loadEntitlement } from "../plans/entitlements";

/**
 * The public tap page shows the product catalogue when the owner has Menu or Store.
 * The services board is separate: booking is allowed only when services-booking is unlocked.
 */
export async function publicCatalogue(ownerId: string) {
  const entitlement = await loadEntitlement(ownerId);
  const bookingLocked = await featureBlock(ownerId, "services-booking");
  return {
    showCatalogue: entitlement.modules.includes("MENU") || entitlement.modules.includes("STORE"),
    canOrder: entitlement.modules.includes("STORE"),
    canBookServices: !bookingLocked
  };
}

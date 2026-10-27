export type PublicServicesView = "board" | "message" | "menu";

/**
 * The services board needs services-booking.
 * A locked services-only page shows a normal message.
 * Menu and mixed pages keep the product board.
 */
export function publicServicesView(input: {
  catalogMode: "MENU" | "SERVICES" | "BOTH";
  view?: "menu" | "services";
  canBookServices: boolean;
}): PublicServicesView {
  if (input.catalogMode === "SERVICES") return input.canBookServices ? "board" : "message";
  if (!input.canBookServices) return "menu";
  if (input.catalogMode === "BOTH" || input.view === "services") return "board";
  return "menu";
}

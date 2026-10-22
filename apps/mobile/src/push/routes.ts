/** Maps a push payload from /api/v1 onto an in-app screen. */
export function routeForPush(data: Record<string, unknown> | null | undefined) {
  const type = typeof data?.type === "string" ? data.type : "";
  const url = typeof data?.url === "string" ? data.url : "";
  if (type === "negative_feedback" || url.includes("/feedback")) return "/(app)/orders?tab=feedback";
  if (type === "store_order" || type === "order_status" || url.includes("/dashboard/orders")) return "/(app)/orders?tab=orders";
  if (type === "plan_reminder" || type === "tap_expired" || url.includes("/billing")) return "/(app)/shop?tab=plan";
  const shopOrder = url.split("/shop/orders/")[1]?.split(/[?#/]/)[0];
  if (shopOrder) return `/(app)/shop?order=${encodeURIComponent(shopOrder)}`;
  if (url.includes("/shop")) return "/(app)/shop";
  return "/(app)";
}

const SHOP_ORDER_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Shop order ids are a single safe token. Anything else is dropped. */
export function shopOrderId(value: string) {
  const id = value.trim();
  return SHOP_ORDER_ID.test(id) ? id : null;
}

export function shopOrderRoute(value: string) {
  const id = shopOrderId(value);
  if (!id) return null;
  return `/(app)/shop?order=${encodeURIComponent(id)}`;
}

function orderFromDeepLink(url: string) {
  const match = url.match(/^reviewqr:\/\/shop\?order=([^&#]*)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function orderFromShopPath(url: string) {
  const at = url.indexOf("/shop/orders/");
  if (at < 0) return null;
  return url.slice(at + "/shop/orders/".length).split(/[?#]/)[0];
}

/** Maps a push payload from /api/v1 onto an in-app screen. */
export function routeForPush(data: Record<string, unknown> | null | undefined) {
  const type = typeof data?.type === "string" ? data.type : "";
  const url = typeof data?.url === "string" ? data.url : "";
  if (type === "negative_feedback" || url.includes("/feedback")) return "/(app)/orders?tab=feedback";
  if (type === "store_order" || type === "order_status" || url.includes("/dashboard/orders")) return "/(app)/orders?tab=orders";
  if (type === "plan_active") return "/(app)/plan";
  if (type === "plan_reminder" || type === "tap_expired" || url.includes("/billing")) return "/(app)/plan";
  const explicit = orderFromDeepLink(url) ?? (typeof data?.order === "string" ? data.order : null);
  if (explicit !== null) return shopOrderRoute(explicit) ?? "/(app)";
  const pathId = orderFromShopPath(url);
  if (pathId !== null) return shopOrderRoute(pathId) ?? "/(app)";
  if (url.includes("/shop")) return "/(app)/shop";
  return "/(app)";
}

/** One bucket per caller and printed code. The visitor id is not a limit key. */
export function menuViewLimitKey(ip: string, shortCode: string) {
  return `menu-view:${ip || "unknown"}:${shortCode}`;
}

const eventSegments: Record<string, string> = {
  "agent.pending": "agents",
  "device.pending": "devices",
  "print.proof.pending": "proofs",
  "payout.due": "payouts",
  "refund.requested": "refunds",
  "shop.order.paid": "orders",
  "support.ticket.created": "support",
  "payment.failed": "payments"
};

export function adminNotificationRoute(data: Record<string, unknown>) {
  const event = typeof data.event === "string" ? data.event : typeof data.type === "string" ? data.type : "";
  const segment = eventSegments[event];
  if (segment) return `/(admin)/(tabs)/inbox?segment=${segment}`;
  if (event === "payment.paid") return "/(admin)/(tabs)/money?tab=payments";
  if (event === "payment.failed.pending") return "/(admin)/(tabs)/money?tab=payments&status=FAILED";
  const targetType = typeof data.targetType === "string" ? data.targetType : "";
  const targetId = typeof data.targetId === "string" ? data.targetId : "";
  if (targetId && (targetType === "user" || targetType === "business")) {
    return `/(admin)/account?kind=${targetType}&id=${encodeURIComponent(targetId)}`;
  }
  if (targetType === "support") return "/(admin)/support";
  if (targetType === "whatsapp") return "/(admin)/whatsapp";
  return null;
}

/**
 * Admin pushes carry `data: { event, key }` (lib/admin/push.ts). `event` is an
 * AdminPushEvent, the same names as the notify preferences in Settings.
 */
const eventSegments: Record<string, string> = {
  agentPending: "agents",
  printProof: "proofs",
  payoutDue: "payouts",
  supportTicket: "support",
  failedPayment: "failed"
};

export function adminNotificationRoute(data: Record<string, unknown>) {
  const event = typeof data.event === "string" ? data.event : "";
  const segment = eventSegments[event];
  if (segment) return `/(admin)/(tabs)/inbox?segment=${segment}`;
  if (event === "paidPayment") return "/(admin)/(tabs)/money?tab=payments&status=COMPLETED";
  if (event === "signup") return "/(admin)/(tabs)/home";
  if (event === "whatsappDown") return "/(admin)/whatsapp";
  return null;
}

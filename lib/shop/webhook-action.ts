/** What a verified shop webhook may do. Signature checks happen before this. */

export function shopWebhookAction(input: {
  deliverySeen: boolean;
  matchesOrder: boolean;
  amountMatches: boolean;
  confirmed: boolean;
  failed: boolean;
}):
  | { action: "duplicate" }
  | { action: "reject"; error: string }
  | { action: "wait" }
  | { action: "fulfill" }
  | { action: "fail" } {
  if (input.deliverySeen) return { action: "duplicate" };
  if (!input.matchesOrder) return { action: "reject", error: "Order mismatch" };
  if (!input.amountMatches) return { action: "reject", error: "Amount mismatch" };
  if (!input.confirmed && !input.failed) return { action: "wait" };
  if (input.confirmed) return { action: "fulfill" };
  return { action: "fail" };
}

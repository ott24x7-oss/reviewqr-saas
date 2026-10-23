/** Dashboard path that opens Pay now for one scheduled-downgrade invoice. */
export function invoicePayPath(paymentId: string) {
  return `/dashboard/billing?pay=${encodeURIComponent(paymentId)}`;
}

export function invoiceReminderText(input: { planName: string; payUrl: string }) {
  return `Your plan changes to ${input.planName} after you pay the invoice. Pay now: ${input.payUrl}`;
}

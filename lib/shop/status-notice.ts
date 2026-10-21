/** Text for an order-status email, WhatsApp message, and push. No I/O. */

export function shopStatusNotice(input: {
  statusLabel: string;
  businessName: string;
  trackingUrl: string;
  awb?: string | null;
  ndr?: string | null;
}) {
  const lines = [
    `${input.businessName} - ${input.statusLabel}.`,
    input.awb ? `AWB ${input.awb}` : "",
    input.ndr ? `Delivery attempt: ${input.ndr}` : "",
    `Track it: ${input.trackingUrl}`
  ].filter(Boolean);
  return {
    subject: `Order update: ${input.statusLabel}`,
    text: lines.join("\n")
  };
}

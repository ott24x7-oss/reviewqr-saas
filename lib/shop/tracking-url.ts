/** Public tracking pages for the carriers supported by the shop. */
export function shopTrackingUrl(provider: string | null | undefined, awb: string | null | undefined) {
  const trackingId = awb?.trim();
  if (!trackingId || !/^[A-Za-z0-9_-]{1,80}$/.test(trackingId)) return null;
  const encoded = encodeURIComponent(trackingId);
  if (provider === "shiprocket") return `https://www.shiprocket.in/shipment-tracking/?awb=${encoded}`;
  if (provider === "delhivery") return `https://www.delhivery.com/tracking?uniqueIdentifier=${encoded}`;
  return null;
}

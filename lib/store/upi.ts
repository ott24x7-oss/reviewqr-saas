/** A UPI VPA such as shop@okaxis. Empty is allowed. Anything else is rejected. */
export function normalizeUpiId(value: string) {
  const vpa = value.trim().toLowerCase();
  if (!vpa) return "";
  if (!/^[a-z0-9._-]{2,40}@[a-z]{2,30}$/.test(vpa)) return null;
  return vpa;
}

/** Rupees with two decimals, which is the `am` value UPI expects. */
export function upiAmount(totalPaise: number) {
  return (Math.max(0, Math.round(totalPaise)) / 100).toFixed(2);
}

export function upiPayUrl(vpa: string, payeeName: string, totalPaise: number) {
  const pa = normalizeUpiId(vpa);
  if (!pa) return "";
  const name = payeeName.trim().slice(0, 50) || "Store";
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(name)}&am=${upiAmount(totalPaise)}&cu=INR`;
}

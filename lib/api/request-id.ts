/** Keep a caller-supplied id when it is a short token. Otherwise mint one. */
export function incomingRequestId(raw: string | null | undefined) {
  const clean = (raw || "").replace(/[^\w.-]/g, "").slice(0, 80);
  if (clean) return clean;
  return crypto.randomUUID();
}

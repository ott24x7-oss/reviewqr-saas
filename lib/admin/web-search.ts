/** Next 14 searchParams are a plain object. Pages pass them through unchanged. */
export function adminSearchParams(input?: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  if (!input) return search;
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") search.set(key, value);
  }
  return search;
}

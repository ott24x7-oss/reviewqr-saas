export const PRODUCTION_API_ORIGIN = "https://qr24x7.in";

/** Dev OTP text is allowed only in a dev bundle that is not pointed at production. */
export function devSurfaceAllowed(input?: { dev?: boolean; apiUrl?: string | null }) {
  const dev = input?.dev ?? (typeof __DEV__ === "boolean" ? __DEV__ : false);
  if (!dev) return false;
  const apiUrl = (input?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (apiUrl === PRODUCTION_API_ORIGIN) return false;
  return true;
}

/**
 * Branding helper. Wraps getSiteConfig() with a smaller, public-friendly
 * shape so we can pass it to client components (navbar, dashboard shell,
 * etc) without leaking the rest of the site config.
 *
 * Use getBrand() in server components / route handlers and pass the
 * result down as a prop.
 */
import { getSiteConfig } from "./settings";

export type Brand = {
  name: string;
  logoUrl: string;
  appUrl: string;
  supportEmail: string;
  tagline: string;
};

export async function getBrand(): Promise<Brand> {
  const cfg = await getSiteConfig();
  return {
    name: cfg.appName,
    logoUrl: cfg.logoUrl,
    appUrl: cfg.appUrl,
    supportEmail: cfg.supportEmail,
    tagline: cfg.marketingTagline
  };
}

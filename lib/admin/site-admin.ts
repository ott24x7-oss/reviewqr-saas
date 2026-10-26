import { prisma } from "@/lib/db";
import { maskSecret } from "@/lib/admin";
import { getSiteConfig, getTurnstileConfig } from "@/lib/settings";
import { CODE_PRESETS } from "@/lib/tap/presets";
import { readAdminThemes } from "@/lib/tap/theme-store";

export type PlatformBranding = { logoDataUrl: string; brandName: string; tagline: string; footerText: string; primaryColor: string };
const EMPTY_BRANDING: PlatformBranding = { logoDataUrl: "", brandName: "", tagline: "", footerText: "", primaryColor: "" };

export async function loadAdminPlatformBranding(): Promise<PlatformBranding> {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: "singleton" } });
    return row ? { logoDataUrl: row.logoDataUrl, brandName: row.brandName, tagline: row.tagline, footerText: row.footerText, primaryColor: row.primaryColor } : EMPTY_BRANDING;
  } catch {
    return EMPTY_BRANDING;
  }
}

export async function loadAdminWebsiteSettings() {
  const [site, turnstile, branding] = await Promise.all([getSiteConfig(), getTurnstileConfig(), loadAdminPlatformBranding()]);
  return { site, turnstile: { ...turnstile, secretKey: maskSecret(turnstile.secretKey) }, branding };
}

export async function loadAdminThemeSettings() {
  const [extra, saved] = await Promise.all([
    readAdminThemes(),
    prisma.industryPreset.findMany({ orderBy: { industry: "asc" } })
  ]);
  return {
    extra,
    code: Object.entries(CODE_PRESETS).map(([industry, links]) => ({ industry, links })),
    saved: saved.map((row) => ({ industry: row.industry, links: row.links }))
  };
}

export function adminSettingsSection(value: string | string[] | undefined, allowed: readonly string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

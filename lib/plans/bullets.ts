import { FEATURES } from "@reviewqr/shared";

export type PlanBullet = { en: string; hi: string; compare: boolean };

export function parseBullets(value: unknown): PlanBullet[] {
  if (!Array.isArray(value)) return [];
  const bullets: PlanBullet[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const item = row as { en?: unknown; hi?: unknown; compare?: unknown };
    const en = typeof item.en === "string" ? item.en.trim() : "";
    const hi = typeof item.hi === "string" ? item.hi.trim() : "";
    if (!en || !hi) continue;
    bullets.push({ en, hi, compare: item.compare === true });
  }
  return bullets;
}

/** Used when a plan has no bullets of its own. */
export function bulletsFromModules(modules: readonly string[]): PlanBullet[] {
  return FEATURES.filter((feature) => modules.includes(feature.module)).map((feature) => ({
    en: feature.labelEn,
    hi: feature.labelHi,
    compare: true
  }));
}

export function resolveBullets(value: unknown, modules: readonly string[]): PlanBullet[] {
  const written = parseBullets(value);
  return written.length ? written : bulletsFromModules(modules);
}

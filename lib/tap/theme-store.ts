import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ThemePreset } from "./themes";

const KEY = "tap_themes";

function asList(value: unknown): ThemePreset[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ThemePreset => {
    return !!item && typeof item === "object" && typeof (item as ThemePreset).id === "string" && !!(item as ThemePreset).tokens;
  });
}

export async function readAdminThemes(): Promise<ThemePreset[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  if (!row) return [];
  try {
    return asList(JSON.parse(row.value));
  } catch {
    return [];
  }
}

export async function writeAdminThemes(themes: ThemePreset[], userId?: string) {
  const json = JSON.stringify(themes);
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: json, updatedBy: userId || null },
    update: { value: json, updatedBy: userId || null }
  });
  revalidateTag("tap-themes");
}

export async function revalidateBusinessTap(businessId: string) {
  revalidateTag(`biz:${businessId}`);
  const [codes, business] = await Promise.all([
    prisma.qRCode.findMany({
      where: { businessId },
      select: { shortCode: true }
    }),
    prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } })
  ]);
  if (business?.slug) revalidateTag(`slug:${business.slug}`);
  for (const code of codes) revalidateTag(`tap:${code.shortCode}`);
}

export function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, Prisma.JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) out[key] = item;
  }
  return out;
}

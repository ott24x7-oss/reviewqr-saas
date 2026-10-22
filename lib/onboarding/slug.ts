import { slugProblem } from "@reviewqr/shared";
import { prisma } from "../db";
import { isReservedSlug } from "../tap/reserved-slugs";
import { absoluteUrl } from "../utils";

export type SlugCheck = {
  slug: string;
  available: boolean;
  reason: "empty" | "invalid" | "reserved" | "taken" | null;
  url: string;
};

export async function checkSlug(raw: string): Promise<SlugCheck> {
  const slug = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 40);
  const problem = slugProblem(slug);
  if (problem) return { slug, available: false, reason: problem, url: "" };
  if (isReservedSlug(slug)) return { slug, available: false, reason: "reserved", url: "" };
  const taken = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (taken) return { slug, available: false, reason: "taken", url: "" };
  return { slug, available: true, reason: null, url: absoluteUrl(`/${slug}`) };
}

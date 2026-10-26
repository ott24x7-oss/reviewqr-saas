import { normalizeSlug, pastedLinkRejected, slugCandidates, slugProblem } from "@reviewqr/shared";
import { prisma } from "../db";
import { isReservedSlug } from "../tap/reserved-slugs";
import { absoluteUrl } from "../utils";

export type SlugCheck = {
  slug: string;
  available: boolean;
  reason: "empty" | "invalid" | "reserved" | "taken" | null;
  url: string;
  suggestions: string[];
};

async function freeSuggestions(seeds: string[], current: string) {
  const wanted = [...new Set(seeds.flatMap((seed) => slugCandidates(seed)))]
    .filter((slug) => slug && slug !== current)
    .slice(0, 8);
  if (!wanted.length) return [];
  const rows = await prisma.business.findMany({
    where: { slug: { in: wanted } },
    select: { slug: true }
  });
  const used = new Set(rows.map((row) => row.slug));
  return wanted.filter((slug) => !used.has(slug) && !isReservedSlug(slug)).slice(0, 4);
}

export async function checkSlug(raw: string, hintName = ""): Promise<SlugCheck> {
  if (pastedLinkRejected(raw)) {
    const suggestions = await freeSuggestions([hintName], "");
    return { slug: "", available: false, reason: "invalid", url: "", suggestions };
  }
  const slug = normalizeSlug(raw);
  const suggestions = await freeSuggestions([hintName, slug], slug);
  const problem = slugProblem(slug);
  if (problem) return { slug, available: false, reason: problem, url: "", suggestions };
  if (isReservedSlug(slug)) return { slug, available: false, reason: "reserved", url: "", suggestions };
  const taken = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (taken) return { slug, available: false, reason: "taken", url: "", suggestions };
  return { slug, available: true, reason: null, url: absoluteUrl(`/${slug}`), suggestions };
}

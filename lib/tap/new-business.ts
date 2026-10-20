import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CODE_PRESETS, industryKey, linkNeedsUrl } from "./presets";
import { fillKnownUrls, normalizeLinks, type KnownContact } from "./page-draft";

export async function linksForNewBusiness(industry: string | null | undefined, contact: KnownContact) {
  const key = industryKey(industry);
  let links = CODE_PRESETS[key] || CODE_PRESETS.other;
  const row = await prisma.industryPreset.findUnique({ where: { industry: key } }).catch(() => null);
  if (row) {
    const parsed = normalizeLinks(row.links);
    if (!("error" in parsed) && parsed.links.length) links = parsed.links;
  }
  return fillKnownUrls(links, contact).map((link) =>
    link.enabled && linkNeedsUrl(link.type) && !link.url ? { ...link, enabled: false } : link
  );
}

export async function attachTapDraft(businessId: string, industry: string | null | undefined, contact: KnownContact) {
  const links = await linksForNewBusiness(industry, contact);
  await prisma.tapPage.create({
    data: {
      businessId,
      draft: { links, bio: "", bioHi: "" } as unknown as Prisma.InputJsonValue
    }
  });
}

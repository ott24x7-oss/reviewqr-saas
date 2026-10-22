import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { hoursFromPublished } from "@/lib/tap/links";
import { tapAccess } from "@/lib/tap/resolve";
import { linksForNewBusiness } from "@/lib/tap/new-business";
import { normalizeLinks } from "@/lib/tap/page-draft";
import type { StoredLink } from "@/lib/tap/presets";
import { WEEK_DAYS, type WeekHours } from "@/lib/tap/hours";
import { TapEditor } from "./tap-editor";

export const dynamic = "force-dynamic";

export default async function TapEditorPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) notFound();
  const [page, qr, owner, entitlement] = await Promise.all([
    prisma.tapPage.findUnique({ where: { businessId: access.id } }),
    prisma.qRCode.findFirst({
      where: { businessId: access.id, status: "ACTIVE" },
      select: { shortCode: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.user.findUnique({
      where: { id: access.ownerId },
      select: { subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true }
    }),
    loadEntitlement(access.ownerId)
  ]);
  const draft = page?.draft && typeof page.draft === "object" && !Array.isArray(page.draft) ? page.draft : null;
  const storedLinks = draft && Array.isArray(draft.links) ? draft.links : null;
  const parsed = storedLinks ? normalizeLinks(storedLinks) : null;
  const links: StoredLink[] =
    parsed && !("error" in parsed) ? parsed.links : await linksForNewBusiness(access.industry, access);
  const hours = hoursFromPublished(draft) || {};

  return (
    <TapEditor
      businessId={access.id}
      businessName={access.name}
      logo={access.logo}
      cover={access.coverImage}
      description={access.description || ""}
      canEdit={access.accessRole !== "STAFF"}
      code={qr?.shortCode || null}
      publishedAt={page?.publishedAt ? page.publishedAt.toISOString() : null}
      bio={typeof draft?.bio === "string" ? draft.bio : ""}
      bioHi={typeof draft?.bioHi === "string" ? draft.bioHi : ""}
      links={links}
      hours={blankHours(hours)}
      gallery={galleryLines(draft)}
      modules={entitlement.modules}
      limited={owner ? tapAccess(owner).limited : false}
      directMode={access.directMode === "DIRECT" ? "DIRECT" : "TAP_PAGE"}
      directTarget={access.directTarget || ""}
    />
  );
}

function galleryLines(draft: { gallery?: unknown } | null) {
  if (!draft || !Array.isArray(draft.gallery)) return [];
  return draft.gallery.filter((item): item is string => typeof item === "string").slice(0, 8);
}

function blankHours(hours: WeekHours) {
  const out: Record<string, { open: string; close: string }> = {};
  for (const day of WEEK_DAYS) {
    const row = hours[day];
    out[day] = { open: row?.open || "", close: row?.close || "" };
  }
  return out;
}

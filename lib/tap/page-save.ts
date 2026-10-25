import type { Prisma } from "@prisma/client";
import { tapSaveSchema } from "@reviewqr/shared";
import { logAudit } from "../admin";
import { fail, ok } from "../api/result";
import { prisma } from "../db";
import { effectiveTier } from "../payments";
import { sanitizeText } from "../sanitize";
import { planOwner, requireBusinessRole } from "../tenant";
import { storedDirectOptions } from "./direct";
import { hoursFromPublished, safeImageSrc } from "./links";
import { nfcUrl, publicAppOrigin } from "./nfc";
import { normalizeLinks } from "./page-draft";
import { canonicalThemeId, findTheme, FREE_THEME_ID, THEME_PRESETS } from "./themes";
import { jsonObject, readAdminThemes, revalidateBusinessTap } from "./theme-store";

const limitSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} satisfies Prisma.UserSelect;

function textField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function linksFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

/** The tap page the owner edits, plus the public code used for preview and QR. */
export async function readTapPage(userId: string, businessId: string) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  const [page, qr, extra] = await Promise.all([
    prisma.tapPage.findUnique({ where: { businessId: business.id } }),
    prisma.qRCode.findFirst({
      where: { businessId: business.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { shortCode: true }
    }),
    readAdminThemes()
  ]);
  const draft = jsonObject(page?.draft ?? null);
  const published = jsonObject(page?.published ?? null);
  const source = Object.keys(draft).length ? draft : published;
  const themes = [...THEME_PRESETS, ...extra].map((theme) => ({
    id: theme.id,
    name: theme.name,
    premium: theme.premium,
    bg: theme.tokens.bg,
    ink: theme.tokens.ink,
    buttonBg: theme.tokens.buttonBg,
    buttonInk: theme.tokens.buttonInk
  }));
  const origin = publicAppOrigin(process.env.NEXT_PUBLIC_APP_URL);
  return ok({
    code: qr?.shortCode ?? null,
    publicPath: qr ? `/t/${qr.shortCode}` : null,
    tapUrl: qr && origin ? nfcUrl(origin, qr.shortCode) : null,
    bio: textField(source.bio),
    bioHi: textField(source.bioHi),
    themeId: canonicalThemeId(textField(source.theme) || FREE_THEME_ID),
    links: linksFrom(source.links),
    themes,
    directMode: business.directMode === "DIRECT" ? "DIRECT" : "TAP_PAGE",
    directTarget: business.directTarget || ""
  });
}

/** Saves tap buttons. A theme id, when present, is checked against the plan. */
export async function saveTapPage(userId: string, businessId: string, raw: unknown) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const parsed = tapSaveSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid input");

  const links = normalizeLinks(parsed.data.links);
  if ("error" in links) return fail(400, links.error);
  const directMode = parsed.data.directMode;
  const directTarget = (parsed.data.directTarget || "").trim().slice(0, 40);
  if (directMode === "DIRECT" && !storedDirectOptions(links.links, "q", "preview").some((item) => item.key === directTarget)) {
    return fail(400, "Choose an enabled button");
  }

  const bio = sanitizeText(parsed.data.bio || "", 400);
  const bioHi = sanitizeText(parsed.data.bioHi || "", 400);
  const hours = hoursFromPublished({ hours: parsed.data.hours }) || {};
  const existing = await prisma.tapPage.findUnique({ where: { businessId: business.id } });
  const draft = jsonObject(existing?.draft ?? null);
  const published = jsonObject(existing?.published ?? null);
  draft.bio = bio;
  draft.bioHi = bioHi;
  draft.hours = hours as Prisma.JsonValue;
  draft.links = links.links as unknown as Prisma.JsonValue;
  if (parsed.data.gallery) {
    const gallery = parsed.data.gallery.map((url) => safeImageSrc(url)).filter((url): url is string => !!url);
    draft.gallery = gallery as unknown as Prisma.JsonValue;
  }

  const publish = parsed.data.action === "publish";
  if (publish) {
    published.bio = bio;
    published.bioHi = bioHi;
    published.hours = draft.hours;
    published.links = draft.links;
    if (draft.gallery) published.gallery = draft.gallery;
  }

  if (parsed.data.themeId) {
    const extra = await readAdminThemes();
    const preset = findTheme(canonicalThemeId(parsed.data.themeId), extra);
    if (!preset) return fail(400, "Unknown theme");
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: limitSelect });
    if (!actor) return fail(401, "Unauthorized");
    const owner = await planOwner(actor, business.ownerId);
    if (!owner) return fail(404, "Not found");
    if (preset.premium && effectiveTier(owner) === "FREE") {
      return fail(402, "That theme is for paid plans");
    }
    delete draft.customTokens;
    delete published.customTokens;
    draft.theme = preset.id;
    published.theme = preset.id;
  }

  const data = {
    draft: draft as Prisma.InputJsonValue,
    ...(publish || parsed.data.themeId
      ? { published: published as Prisma.InputJsonValue, publishedAt: new Date() }
      : {})
  };
  await prisma.tapPage.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...data },
    update: data
  });
  if (directMode) {
    await prisma.business.update({
      where: { id: business.id },
      data: { directMode, directTarget: directMode === "DIRECT" ? directTarget : "" }
    });
  }
  if (publish || parsed.data.themeId || directMode) {
    try {
      await revalidateBusinessTap(business.id);
    } catch {
      // The save already landed. Cache tags are unavailable when a test calls the handler directly.
    }
  }
  if (publish) {
    await logAudit({
      userId,
      action: "tap.publish",
      entity: "business",
      entityId: business.id,
      metadata: { links: links.links.length }
    });
  }
  return ok({ published: publish });
}

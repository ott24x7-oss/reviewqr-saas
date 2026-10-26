import type { Prisma } from "@prisma/client";
import { themeActionSchema } from "@reviewqr/shared";
import { logAudit } from "../admin";
import { fail, ok } from "../api/result";
import { prisma } from "../db";
import { effectiveTier } from "../payments";
import { assertSafeOutboundUrl } from "../ssrf";
import { planOwner, requireBusinessRole } from "../tenant";
import { jsonObject, readAdminThemes, revalidateBusinessTap } from "./theme-store";
import { THEME_FONTS, buildBackground, findTheme, themeContrastError, type ThemeCustom } from "./themes";
import { safeTapUrl } from "./urls";

const limitSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} as const;

/** Saves, resets, or copies a tap-page theme. The same path the web editor uses. */
export async function saveBusinessTheme(userId: string, businessId: string, raw: unknown) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: limitSelect });
  if (!actor) return fail(401, "Unauthorized");
  const owner = await planOwner(actor, business.ownerId);
  if (!owner) return fail(404, "Not found");

  const parsed = themeActionSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid input");
  const data = parsed.data;
  const extra = await readAdminThemes();
  const existing = await prisma.tapPage.findUnique({ where: { businessId: business.id } });
  const published = jsonObject(existing?.published ?? null);
  const draft = jsonObject(existing?.draft ?? null);

  if (data.action === "duplicate") {
    const library = Array.isArray(draft.library) ? [...draft.library] : [];
    library.push({
      name: data.duplicateName || "Copy",
      theme: published.theme || "minimal",
      customTokens: published.customTokens || null
    });
    draft.library = library as Prisma.JsonValue;
  } else if (data.action === "reset") {
    delete published.theme;
    delete published.customTokens;
    delete published.seasonal;
    draft.theme = "minimal";
    delete draft.customTokens;
  } else {
    const themeId = data.themeId || "minimal";
    const preset = findTheme(themeId, extra);
    if (!preset) return fail(400, "Unknown theme");
    if (preset.premium && effectiveTier(owner) === "FREE") return fail(402, "That theme is for paid plans");
    const bg = data.bg || preset.tokens.bg;
    const ink = data.ink || preset.tokens.ink;
    const contrast = themeContrastError(bg, ink);
    if (contrast) return fail(400, contrast.suggested ? `${contrast.error}. Try ${contrast.suggested}` : contrast.error);
    let video: string | null = null;
    if (data.video) {
      video = safeTapUrl(data.video, "https");
      if (!video) return fail(400, "Video URL must be https");
      try {
        await assertSafeOutboundUrl(video);
      } catch (err) {
        return fail(400, err instanceof Error ? err.message : "Video URL was rejected");
      }
    }
    const keepArt = data.backgroundType === "preset";
    const sameButtons =
      (data.buttonBg || preset.tokens.buttonBg) === preset.tokens.buttonBg &&
      (data.buttonInk || preset.tokens.buttonInk) === preset.tokens.buttonInk &&
      (!data.buttons || data.buttons === preset.tokens.buttons);
    const custom: ThemeCustom = {
      bg,
      ink,
      buttonBg: data.buttonBg,
      buttonInk: data.buttonInk,
      font: data.font && (THEME_FONTS as readonly string[]).includes(data.font) ? (data.font as ThemeCustom["font"]) : undefined,
      buttons: data.buttons,
      avatar: data.avatar,
      entrance: data.entrance,
      radius: data.radius,
      background: keepArt
        ? preset.tokens.background
        : buildBackground({ type: data.backgroundType, bg, to: data.backgroundTo, imageUrl: data.imageUrl || "" }),
      buttonFill: keepArt && sameButtons ? preset.tokens.buttonFill || null : null,
      video
    };
    published.theme = themeId;
    published.customTokens = custom as unknown as Prisma.JsonValue;
    published.seasonal = data.seasonalFrom && data.seasonalTo ? { from: data.seasonalFrom, to: data.seasonalTo } : null;
    draft.theme = themeId;
    draft.customTokens = published.customTokens;
    draft.seasonal = published.seasonal;
  }

  const saved = {
    draft: draft as Prisma.InputJsonValue,
    published: published as Prisma.InputJsonValue,
    publishedAt: new Date()
  };
  await prisma.tapPage.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...saved },
    update: saved
  });
  await revalidateBusinessTap(business.id);
  await logAudit({
    userId,
    action: "theme.update",
    entity: "business",
    entityId: business.id,
    metadata: { action: data.action, theme: data.themeId || "minimal" }
  });
  return ok({ ok: true as const, suggested: null as string | null });
}

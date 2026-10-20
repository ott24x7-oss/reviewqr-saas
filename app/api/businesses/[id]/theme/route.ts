import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planOwner, requireBusinessRole } from "@/lib/tenant";
import { effectiveTier } from "@/lib/payments";
import { logAudit } from "@/lib/admin";
import { assertSafeOutboundUrl } from "@/lib/ssrf";
import { jsonObject, readAdminThemes, revalidateBusinessTap } from "@/lib/tap/theme-store";
import {
  THEME_FONTS,
  buildBackground,
  findTheme,
  themeContrastError,
  type ThemeCustom
} from "@/lib/tap/themes";
import { safeTapUrl } from "@/lib/tap/urls";

const schema = z.object({
  action: z.enum(["save", "reset", "duplicate"]).default("save"),
  themeId: z.string().min(1).max(40).optional(),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  buttonBg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  buttonInk: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font: z.string().optional(),
  buttons: z.enum(["filled", "outline", "soft", "glass", "pill", "square", "raised"]).optional(),
  avatar: z.enum(["circle", "rounded", "square"]).optional(),
  entrance: z.enum(["none", "fade", "rise"]).optional(),
  radius: z.enum(["0px", "12px", "16px", "24px", "999px"]).optional(),
  backgroundType: z.enum(["preset", "solid", "gradient", "image", "pattern", "video"]).optional(),
  backgroundTo: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  imageUrl: z.string().max(400).optional().or(z.literal("")),
  video: z.string().max(400).optional().or(z.literal("")),
  seasonalFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  seasonalTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  duplicateName: z.string().max(40).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owner = await planOwner(user, business.ownerId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
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
    if (!preset) return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
    if (preset.premium && effectiveTier(owner) === "FREE") {
      return NextResponse.json({ error: "That theme is for paid plans" }, { status: 402 });
    }
    const bg = data.bg || preset.tokens.bg;
    const ink = data.ink || preset.tokens.ink;
    const contrast = themeContrastError(bg, ink);
    if (contrast) {
      return NextResponse.json({ error: contrast.error, suggested: contrast.suggested }, { status: 400 });
    }
    let video: string | null = null;
    if (data.video) {
      video = safeTapUrl(data.video, "https");
      if (!video) return NextResponse.json({ error: "Video URL must be https" }, { status: 400 });
      try {
        await assertSafeOutboundUrl(video);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Video URL was rejected" }, { status: 400 });
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
    published.seasonal =
      data.seasonalFrom && data.seasonalTo ? { from: data.seasonalFrom, to: data.seasonalTo } : null;
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
    userId: user.id,
    action: "theme.update",
    entity: "business",
    entityId: business.id,
    metadata: { action: data.action, theme: data.themeId || "minimal" }
  });
  return NextResponse.json({ ok: true, suggested: readableSuggestion(data.bg, data.ink) });
}

function readableSuggestion(bg?: string, ink?: string) {
  if (!bg || !ink) return null;
  return themeContrastError(bg, ink)?.suggested || null;
}

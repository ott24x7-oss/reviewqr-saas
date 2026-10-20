import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { readAdminThemes, writeAdminThemes } from "@/lib/tap/theme-store";
import { THEME_PRESETS, freeTheme, themeContrastError, type ThemePreset, type ThemeTokens } from "@/lib/tap/themes";

const schema = z.object({
  id: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(40),
  premium: z.boolean(),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  remove: z.boolean().optional()
});

export async function GET() {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const extra = await readAdminThemes();
  return NextResponse.json({ presets: THEME_PRESETS, extra });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  if (THEME_PRESETS.some((theme) => theme.id === data.id)) {
    return NextResponse.json({ error: "That id is already a built-in theme" }, { status: 400 });
  }
  const contrast = themeContrastError(data.bg, data.ink);
  if (!data.remove && contrast) {
    return NextResponse.json({ error: contrast.error, suggested: contrast.suggested }, { status: 400 });
  }
  const current = await readAdminThemes();
  const next = data.remove
    ? current.filter((theme) => theme.id !== data.id)
    : upsert(current, {
        id: data.id,
        name: data.name,
        premium: data.premium,
        tokens: extraTokens(data.bg, data.ink)
      });
  await writeAdminThemes(next, admin.user?.id);
  await logAudit({
    userId: admin.user?.id,
    action: "theme.admin",
    entity: "theme",
    entityId: data.id,
    metadata: { premium: data.premium, remove: !!data.remove }
  });
  return NextResponse.json({ ok: true, extra: next });
}

function extraTokens(bg: string, ink: string): ThemeTokens {
  const base = { ...freeTheme().tokens };
  delete base.buttonFill;
  return { ...base, bg, ink, buttonBg: ink, buttonInk: bg, background: bg };
}

function upsert(list: ThemePreset[], theme: ThemePreset) {
  const rest = list.filter((item) => item.id !== theme.id);
  return [...rest, theme];
}

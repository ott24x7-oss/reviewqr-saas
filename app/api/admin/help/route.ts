import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { announcementLinkToStore, helpVideoToStore } from "@/lib/help/video";
import { getInsightSettings, saveInsightSettings } from "@/lib/reports/settings";

export const dynamic = "force-dynamic";

const AUDIENCES = ["all", "agents", "module:REVIEWS", "module:MENU", "module:STORE"];

function text(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function allowedAudience(value: unknown) {
  const audience = text(value, 40);
  return AUDIENCES.includes(audience) ? audience : "all";
}

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const [articles, announcements, settings] = await Promise.all([
    prisma.helpArticle.findMany({ orderBy: [{ language: "asc" }, { sortOrder: "asc" }, { title: "asc" }] }),
    prisma.announcement.findMany({ orderBy: { startsAt: "desc" }, take: 50 }),
    getInsightSettings()
  ]);
  return NextResponse.json({ articles, announcements, settings });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.kind === "settings") {
    const settings = await saveInsightSettings(body, auth.user.id);
    return NextResponse.json({ settings });
  }
  if (body.kind === "announcement") {
    const startsAt = new Date(String(body.startsAt || ""));
    const endsAt = new Date(String(body.endsAt || ""));
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }
    const audience = allowedAudience(body.audience);
    const link = announcementLinkToStore(body.link);
    if (link == null) return NextResponse.json({ error: "Link must be an https URL or a site path" }, { status: 400 });
    const row = await prisma.announcement.create({
      data: {
        title: text(body.title, 120) || "Announcement",
        titleHi: text(body.titleHi, 120),
        body: text(body.body, 2000),
        bodyHi: text(body.bodyHi, 2000),
        link,
        audience,
        startsAt,
        endsAt,
        published: body.published === true
      }
    });
    return NextResponse.json({ announcement: row });
  }
  const language = body.language === "hi" ? "hi" : "en";
  const slug = text(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, "") || `article-${Date.now().toString(36)}`;
  const videoUrl = helpVideoToStore(body.videoUrl);
  if (videoUrl == null) {
    return NextResponse.json({ error: "Video must be YouTube, Vimeo, or a file on our storage" }, { status: 400 });
  }
  try {
    const row = await prisma.helpArticle.create({
      data: {
        slug,
        language,
        category: text(body.category, 40) || "General",
        title: text(body.title, 160) || "Untitled",
        body: text(body.body, 8000),
        videoUrl,
        contextKey: text(body.contextKey, 40),
        sortOrder: Number(body.sortOrder) || 0,
        published: body.published === true
      }
    });
    return NextResponse.json({ article: row });
  } catch {
    return NextResponse.json({ error: "That slug already exists in this language" }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = text(body.id, 40);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (body.kind === "announcement") {
    const startsAt = body.startsAt ? new Date(String(body.startsAt)) : undefined;
    const endsAt = body.endsAt ? new Date(String(body.endsAt)) : undefined;
    let link: string | undefined;
    if (body.link != null) {
      const stored = announcementLinkToStore(body.link);
      if (stored == null) return NextResponse.json({ error: "Link must be an https URL or a site path" }, { status: 400 });
      link = stored;
    }
    const row = await prisma.announcement.update({
      where: { id },
      data: {
        title: body.title != null ? text(body.title, 120) : undefined,
        titleHi: body.titleHi != null ? text(body.titleHi, 120) : undefined,
        body: body.body != null ? text(body.body, 2000) : undefined,
        bodyHi: body.bodyHi != null ? text(body.bodyHi, 2000) : undefined,
        link,
        audience: body.audience != null ? allowedAudience(body.audience) : undefined,
        startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : undefined,
        endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : undefined,
        published: typeof body.published === "boolean" ? body.published : undefined
      }
    });
    return NextResponse.json({ announcement: row });
  }
  let videoUrl: string | undefined;
  if (body.videoUrl != null) {
    const stored = helpVideoToStore(body.videoUrl);
    if (stored == null) {
      return NextResponse.json({ error: "Video must be YouTube, Vimeo, or a file on our storage" }, { status: 400 });
    }
    videoUrl = stored;
  }
  const row = await prisma.helpArticle.update({
    where: { id },
    data: {
      category: body.category != null ? text(body.category, 40) : undefined,
      title: body.title != null ? text(body.title, 160) : undefined,
      body: body.body != null ? text(body.body, 8000) : undefined,
      videoUrl,
      contextKey: body.contextKey != null ? text(body.contextKey, 40) : undefined,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) || 0 : undefined,
      published: typeof body.published === "boolean" ? body.published : undefined
    }
  });
  return NextResponse.json({ article: row });
}

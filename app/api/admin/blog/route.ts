import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["en", "hi"]),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(30).max(320),
  bodyMarkdown: z.string().min(20).max(120000),
  coverImageUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  authorName: z.string().trim().min(1).max(100).default("QR24x7"),
  translationKey: z.string().trim().max(100).optional().or(z.literal(""))
});

function safeImageUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function revalidateBlog(locale: string, slug: string) {
  const path = `${locale === "hi" ? "/hi" : ""}/blog/${slug}`;
  revalidatePath(path);
  revalidatePath(locale === "hi" ? "/hi/blog" : "/blog");
  revalidatePath("/sitemap.xml");
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid blog post" }, { status: 400 });
  const value = parsed.data;
  if (value.coverImageUrl && !safeImageUrl(value.coverImageUrl)) return NextResponse.json({ error: "Cover image must be an HTTP or HTTPS URL." }, { status: 400 });
  const post = await prisma.blogPost.create({ data: {
    ...value, coverImageUrl: safeImageUrl(value.coverImageUrl) || null, translationKey: value.translationKey || null,
    publishedAt: value.status === "PUBLISHED" ? new Date() : null
  } }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return null;
    throw error;
  });
  if (!post) return NextResponse.json({ error: "A post with this locale and slug already exists." }, { status: 409 });
  await logAudit({ userId: guard.user.id, action: "settings.blog.update", entity: "BlogPost", entityId: post.id, metadata: { operation: "create", locale: post.locale, slug: post.slug, status: post.status }, ip: getClientIp(req.headers) });
  revalidateBlog(post.locale, post.slug);
  return NextResponse.json({ post }, { status: 201 });
}

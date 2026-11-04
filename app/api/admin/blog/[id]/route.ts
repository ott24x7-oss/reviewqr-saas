import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["en", "hi"]), title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(30).max(320), bodyMarkdown: z.string().min(20).max(120000),
  coverImageUrl: z.string().trim().max(2000).optional().or(z.literal("")), tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]), authorName: z.string().trim().min(1).max(100).default("QR24x7"),
  translationKey: z.string().trim().max(100).optional().or(z.literal(""))
});

function safeImageUrl(value: string | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}

function revalidatePost(locale: string, slug: string) {
  revalidatePath(`${locale === "hi" ? "/hi" : ""}/blog/${slug}`);
  revalidatePath(locale === "hi" ? "/hi/blog" : "/blog");
  revalidatePath("/sitemap.xml");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const existing = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid blog post" }, { status: 400 });
  const value = parsed.data;
  if (value.coverImageUrl && !safeImageUrl(value.coverImageUrl)) return NextResponse.json({ error: "Cover image must be an HTTP or HTTPS URL." }, { status: 400 });
  const publishedAt = value.status === "PUBLISHED" ? existing.publishedAt || new Date() : existing.publishedAt;
  const post = await prisma.blogPost.update({ where: { id: existing.id }, data: {
    ...value, coverImageUrl: safeImageUrl(value.coverImageUrl) || null, translationKey: value.translationKey || null, publishedAt
  } }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return null;
    throw error;
  });
  if (!post) return NextResponse.json({ error: "A post with this locale and slug already exists." }, { status: 409 });
  await logAudit({ userId: guard.user.id, action: "settings.blog.update", entity: "BlogPost", entityId: post.id, metadata: { operation: "update", locale: post.locale, slug: post.slug, status: post.status }, before: { locale: existing.locale, slug: existing.slug, status: existing.status, title: existing.title }, after: { locale: post.locale, slug: post.slug, status: post.status, title: post.title }, ip: getClientIp(req.headers) });
  revalidatePost(existing.locale, existing.slug);
  revalidatePost(post.locale, post.slug);
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const existing = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  await prisma.blogPost.delete({ where: { id: existing.id } });
  await logAudit({ userId: guard.user.id, action: "settings.blog.update", entity: "BlogPost", entityId: existing.id, metadata: { operation: "delete", locale: existing.locale, slug: existing.slug }, before: { locale: existing.locale, slug: existing.slug, status: existing.status, title: existing.title }, ip: getClientIp(req.headers) });
  revalidatePost(existing.locale, existing.slug);
  return NextResponse.json({ ok: true });
}

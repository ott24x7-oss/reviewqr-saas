import { prisma } from "@/lib/db";
import type { BlogPost } from "@prisma/client";

export async function listPublishedBlogPosts(locale: "en" | "hi") {
  return prisma.blogPost.findMany({ where: { locale, status: "PUBLISHED", publishedAt: { not: null } }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] });
}

export async function getPublishedBlogPost(locale: "en" | "hi", slug: string) {
  return prisma.blogPost.findFirst({ where: { locale, slug, status: "PUBLISHED", publishedAt: { not: null } } });
}

export async function getBlogTranslation(post: Pick<BlogPost, "translationKey" | "locale">) {
  if (!post.translationKey) return null;
  return prisma.blogPost.findFirst({ where: { translationKey: post.translationKey, locale: post.locale === "en" ? "hi" : "en", status: "PUBLISHED", publishedAt: { not: null } } });
}

export async function getRelatedBlogPosts(post: Pick<BlogPost, "id" | "locale" | "tags">, take = 3) {
  const candidates = await prisma.blogPost.findMany({ where: { locale: post.locale, status: "PUBLISHED", publishedAt: { not: null }, id: { not: post.id } }, orderBy: { publishedAt: "desc" }, take: 12 });
  return candidates.sort((a, b) => b.tags.filter((tag) => post.tags.includes(tag)).length - a.tags.filter((tag) => post.tags.includes(tag)).length).slice(0, take);
}

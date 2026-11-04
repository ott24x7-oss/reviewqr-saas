import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { BlogPostContent } from "@/components/blog/blog-content";
import { getBrand } from "@/lib/brand";
import { getBlogTranslation, getPublishedBlogPost, getRelatedBlogPosts } from "@/lib/blog/posts";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Params = { slug: string };
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPublishedBlogPost("en", params.slug);
  if (!post) return { title: "Guide not found", robots: { index: false, follow: false } };
  const twin = await getBlogTranslation(post);
  return buildSeoMetadata({ path: `/blog/${post.slug}`, title: post.title, description: post.description, translated: Boolean(twin), alternatePaths: twin ? { en: `/blog/${post.slug}`, hi: `/hi/blog/${twin.slug}` } : undefined, lastModified: post.updatedAt, ogContext: post.tags.slice(0, 2).join(" · ") || "QR24x7 guide" });
}
export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPublishedBlogPost("en", params.slug);
  if (!post) notFound();
  const [brand, related] = await Promise.all([getBrand(), getRelatedBlogPosts(post)]);
  return <SiteShell brand={brand} path={`/blog/${post.slug}`} breadcrumbName={post.title} includeBreadcrumb={false}><BlogPostContent post={post} related={related} locale="en" /></SiteShell>;
}

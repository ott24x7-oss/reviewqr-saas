import type { Metadata } from "next";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { BlogIndexContent } from "@/components/blog/blog-content";
import { getBrand } from "@/lib/brand";
import { listPublishedBlogPosts } from "@/lib/blog/posts";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/blog", title: "QR24x7 business guides", description: "Practical India focused guides to Google reviews, digital menus, WhatsApp ordering, QR codes and customer feedback for local businesses.", ogContext: "Business guides and how-to articles" });
}
export default async function BlogIndexPage() {
  const [brand, posts] = await Promise.all([getBrand(), listPublishedBlogPosts("en")]);
  return <SiteShell brand={brand} path="/blog" includeBreadcrumb={false}><BlogIndexContent posts={posts} locale="en" /></SiteShell>;
}

import type { Metadata } from "next";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { BlogIndexContent } from "@/components/blog/blog-content";
import { getBrand } from "@/lib/brand";
import { listPublishedBlogPosts } from "@/lib/blog/posts";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/blog", locale: "hi", title: "QR24x7 कारोबार गाइड", description: "Google रिव्यू, डिजिटल मेनू, WhatsApp ऑर्डर और ग्राहक फ़ीडबैक पर भारतीय स्थानीय कारोबार के लिए काम की गाइड।", ogContext: "कारोबार की जानकारी और गाइड" });
}
export default async function HindiBlogIndexPage() {
  const [brand, posts] = await Promise.all([getBrand(), listPublishedBlogPosts("hi")]);
  return <SiteShell brand={brand} locale="hi" path="/blog" includeBreadcrumb={false}><BlogIndexContent posts={posts} locale="hi" /></SiteShell>;
}

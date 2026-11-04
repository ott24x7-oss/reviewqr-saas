import Link from "next/link";
import type { BlogPost } from "@prisma/client";
import { buildBreadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { renderSafeMarkdown } from "@/lib/blog/markdown";

function dateLabel(value: Date, locale: "en" | "hi") {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long" }).format(value);
}

export function BlogIndexContent({ posts, locale }: { posts: BlogPost[]; locale: "en" | "hi" }) {
  const hi = locale === "hi";
  const root = hi ? "/hi" : "";
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(buildBreadcrumbJsonLd([{ name: hi ? "होम" : "Home", path: "/" }, { name: hi ? "गाइड" : "Guides", path: "/blog" }], locale)) }} />
    <section className="qr-section qr-blog-index"><div className="qr-wrap">
      <p className="qr-eyebrow">{hi ? "छोटे कारोबार के लिए उपयोगी जानकारी" : "PRACTICAL GUIDES FOR LOCAL BUSINESSES"}</p>
      <h1>{hi ? "कारोबार के लिए QR, रिव्यू और WhatsApp गाइड" : "QR, reviews and WhatsApp guides for your business"}</h1>
      <p className="qr-blog-lead">{hi ? "ग्राहक समीक्षा, डिजिटल मेनू और सीधे ऑर्डर के लिए आसान, काम की सलाह।" : "Clear, practical advice on customer reviews, digital menus and direct ordering."}</p>
      <div className="qr-blog-grid">{posts.map((post) => <article className="qr-blog-card" key={post.id}>
        {post.coverImageUrl ? <img src={post.coverImageUrl} alt="" loading="lazy" /> : null}
        <p className="qr-eyebrow">{post.tags.slice(0, 2).join(" · ") || (hi ? "गाइड" : "GUIDE")}</p>
        <h2><Link href={`${root}/blog/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.description}</p>
        {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{dateLabel(post.publishedAt, locale)}</time> : null}
      </article>)}</div>
      {!posts.length ? <p>{hi ? "नई गाइड जल्द आएँगी।" : "New guides are on the way."}</p> : null}
    </div></section>
  </>;
}

export function BlogPostContent({ post, related, locale }: { post: BlogPost; related: BlogPost[]; locale: "en" | "hi" }) {
  const hi = locale === "hi";
  const root = hi ? "/hi" : "";
  const published = post.publishedAt || post.updatedAt;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: hi ? "होम" : "Home", path: "/" },
    { name: hi ? "गाइड" : "Guides", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` }
  ], locale);
  const article = {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.description,
    inLanguage: hi ? "hi-IN" : "en-IN", datePublished: published.toISOString(), dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName }, publisher: { "@type": "Organization", name: "QR24x7", logo: { "@type": "ImageObject", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in"}/brand/logo-mark.png` } },
    mainEntityOfPage: `${(process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in").replace(/\/$/, "")}${root}/blog/${post.slug}`,
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {})
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(article) }} />
    <article className="qr-section qr-blog-article"><div className="qr-wrap">
      <p className="qr-eyebrow">{post.tags.slice(0, 3).join(" · ") || (hi ? "गाइड" : "GUIDE")}</p>
      <h1>{post.title}</h1><p className="qr-blog-lead">{post.description}</p>
      <div className="qr-blog-byline"><span>{post.authorName}</span><time dateTime={published.toISOString()}>{dateLabel(published, locale)}</time></div>
      {post.coverImageUrl ? <img className="qr-blog-cover" src={post.coverImageUrl} alt="" fetchPriority="high" /> : null}
      <div className="qr-prose qr-blog-prose" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(post.bodyMarkdown) }} />
      <aside className="qr-blog-cta"><h2>{hi ? "अपने ग्राहकों के लिए एक सरल QR पेज बनाएँ" : "Make it easier for customers to find your business"}</h2><p>{hi ? "मेनू, WhatsApp संपर्क और सार्वजनिक रिव्यू लिंक एक जगह रखें।" : "Bring your menu, WhatsApp contact and public review link together."}</p><Link className="qr-button qr-button-dark" href="/register">{hi ? "शुरू करें" : "Get started"} ↗</Link></aside>
      {related.length ? <section className="qr-blog-related"><h2>{hi ? "संबंधित गाइड" : "Related guides"}</h2><ul>{related.map((item) => <li key={item.id}><Link href={`${root}/blog/${item.slug}`}>{item.title}</Link></li>)}</ul></section> : null}
    </div></article>
  </>;
}

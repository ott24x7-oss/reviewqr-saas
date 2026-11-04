import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/primitives";
import { BlogEditor } from "./editor";
import { StarterGuidesButton } from "./starter-guides-button";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog", robots: { index: false, follow: false } };

export default async function AdminBlogPage({ searchParams }: { searchParams: { id?: string } }) {
  await requireAdminPage();
  const [posts, audits, selected] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: [{ updatedAt: "desc" }], select: { id: true, slug: true, locale: true, title: true, status: true, updatedAt: true, publishedAt: true } }),
    prisma.auditLog.findMany({ where: { entity: "BlogPost" }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, action: true, entityId: true, metadata: true, createdAt: true, userId: true } }),
    searchParams.id ? prisma.blogPost.findUnique({ where: { id: searchParams.id } }) : Promise.resolve(null)
  ]);
  if (searchParams.id && !selected) notFound();

  return <div className="space-y-5">
    <PageHeader title="Blog and guides" subtitle="Write and publish English or Hindi guides. Drafts stay private until published." />
    <div className="flex justify-end"><StarterGuidesButton /></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(250px,.65fr)_minmax(0,1.35fr)]">
      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Posts</h2><Link className="text-sm underline" href="/admin/blog">New post</Link></div>
          <ul className="space-y-2">{posts.map((post) => <li key={post.id}><Link className={`block rounded-lg border p-3 ${post.id === selected?.id ? "border-primary" : ""}`} href={`/admin/blog?id=${post.id}`}><span className="block text-xs text-muted-foreground">{post.locale.toUpperCase()} · {post.status.toLowerCase()}</span><strong className="mt-1 block text-sm">{post.title}</strong><span className="mt-1 block text-xs text-muted-foreground">/{post.locale === "hi" ? "hi/" : ""}blog/{post.slug} · Updated {post.updatedAt.toLocaleDateString()}</span></Link></li>)}{!posts.length ? <li className="text-sm text-muted-foreground">No posts yet. Start with a draft.</li> : null}</ul>
        </div>
        <div className="rounded-xl border bg-card p-4"><h2 className="mb-3 font-semibold">Recent audit log</h2><ul className="space-y-2">{audits.map((entry) => <li key={entry.id} className="border-t pt-2 text-xs"><strong>{entry.action}</strong><span className="block text-muted-foreground">{entry.createdAt.toLocaleString()} · {entry.userId || "system"} · {entry.entityId}</span><span className="block text-muted-foreground">{String((entry.metadata as Record<string, unknown> | null)?.operation || "updated")}</span></li>)}</ul></div>
      </aside>
      <section className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">{selected ? "Edit post" : "Create a post"}</h2><BlogEditor key={selected?.id || "new"} initial={selected || undefined} /></section>
    </div>
  </div>;
}

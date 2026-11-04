"use client";

import * as React from "react";
import type { BlogPost } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { renderSafeMarkdown } from "@/lib/blog/markdown";

const emptyPost = {
  slug: "", locale: "en" as const, title: "", description: "", bodyMarkdown: "", coverImageUrl: "", tags: "",
  status: "DRAFT" as const, authorName: "QR24x7", translationKey: ""
};

export function BlogEditor({ initial }: { initial?: BlogPost }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial ? {
    slug: initial.slug, locale: initial.locale as "en" | "hi", title: initial.title, description: initial.description,
    bodyMarkdown: initial.bodyMarkdown, coverImageUrl: initial.coverImageUrl || "", tags: initial.tags.join(", "),
    status: initial.status, authorName: initial.authorName, translationKey: initial.translationKey || ""
  } : emptyPost);
  const [preview, setPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const edit = Boolean(initial);
  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(edit ? `/api/admin/blog/${initial!.id}` : "/api/admin/blog", {
        method: edit ? "PATCH" : "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save post");
      toast.success(form.status === "PUBLISHED" ? "Post published" : "Draft saved");
      router.push(`/admin/blog?id=${data.post.id}`);
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save post"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!initial || !window.confirm("Delete this post permanently?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/blog/${initial.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete post");
      toast.success("Post deleted"); router.push("/admin/blog"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete post"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm"><span>Locale</span><select className="h-10 w-full rounded-md border bg-background px-3" value={form.locale} onChange={(event) => update("locale", event.target.value as "en" | "hi")}><option value="en">English</option><option value="hi">Hindi</option></select></label>
      <label className="space-y-1 text-sm"><span>Status</span><select className="h-10 w-full rounded-md border bg-background px-3" value={form.status} onChange={(event) => update("status", event.target.value as typeof form.status)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
      <label className="space-y-1 text-sm"><span>Slug</span><input className="h-10 w-full rounded-md border bg-background px-3" required value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="google-reviews-for-your-shop" /></label>
      <label className="space-y-1 text-sm"><span>Translation key</span><input className="h-10 w-full rounded-md border bg-background px-3" value={form.translationKey} onChange={(event) => update("translationKey", event.target.value)} placeholder="guide-google-reviews-shop" /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span>Title</span><input className="h-10 w-full rounded-md border bg-background px-3" required value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span>Description</span><textarea className="min-h-20 w-full rounded-md border bg-background p-3" required value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
      <label className="space-y-1 text-sm"><span>Cover image URL</span><input className="h-10 w-full rounded-md border bg-background px-3" value={form.coverImageUrl} onChange={(event) => update("coverImageUrl", event.target.value)} /></label>
      <label className="space-y-1 text-sm"><span>Tags (comma separated)</span><input className="h-10 w-full rounded-md border bg-background px-3" value={form.tags} onChange={(event) => update("tags", event.target.value)} /></label>
      <label className="space-y-1 text-sm"><span>Author name</span><input className="h-10 w-full rounded-md border bg-background px-3" value={form.authorName} onChange={(event) => update("authorName", event.target.value)} /></label>
    </div>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Markdown body</h3><Button type="button" variant="outline" onClick={() => setPreview((value) => !value)}>{preview ? "Edit markdown" : "Preview"}</Button></div>
    {preview ? <article className="qr-prose min-h-80 rounded-xl border bg-background p-5" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(form.bodyMarkdown) }} /> : <textarea className="min-h-[520px] w-full rounded-xl border bg-background p-4 font-mono text-sm leading-6" required value={form.bodyMarkdown} onChange={(event) => update("bodyMarkdown", event.target.value)} />}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : form.status === "PUBLISHED" ? "Save and publish" : "Save draft"}</Button>{initial ? <Button type="button" variant="destructive" disabled={busy} onClick={remove}>Delete</Button> : null}</div>
  </form>;
}

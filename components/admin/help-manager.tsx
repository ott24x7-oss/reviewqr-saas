"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { Input } from "@/components/admin/ui/controls";
import { Textarea } from "@/components/admin/ui/controls";

type Article = {
  id: string;
  slug: string;
  category: string;
  language: string;
  title: string;
  body: string;
  videoUrl: string;
  contextKey: string;
  sortOrder: number;
  published: boolean;
};

type Announcement = {
  id: string;
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  link: string;
  audience: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
};

type Settings = { whatsappNumber: string; reportHourIst: number; reportMinuteIst: number; reportMaxPerMinute: number };

const emptyArticle = {
  slug: "",
  category: "General",
  language: "en",
  title: "",
  body: "",
  videoUrl: "",
  contextKey: "",
  sortOrder: 0,
  published: false
};

export function HelpManager() {
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [settings, setSettings] = React.useState<Settings>({
    whatsappNumber: "",
    reportHourIst: 9,
    reportMinuteIst: 0,
    reportMaxPerMinute: 20
  });
  const [draft, setDraft] = React.useState(emptyArticle);
  const [note, setNote] = React.useState({
    title: "",
    titleHi: "",
    body: "",
    bodyHi: "",
    link: "",
    audience: "all",
    startsAt: "",
    endsAt: "",
    published: false
  });

  async function load() {
    const res = await fetch("/api/admin/help");
    const json = await res.json();
    setArticles(json.articles || []);
    setAnnouncements(json.announcements || []);
    if (json.settings) setSettings(json.settings);
  }

  React.useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function saveArticle(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not save the article");
      return;
    }
    setDraft(emptyArticle);
    toast.success("Article saved");
    await load();
  }

  async function toggleArticle(article: Article) {
    await fetch("/api/admin/help", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: article.id, published: !article.published })
    });
    await load();
  }

  async function uploadVideo(file: File) {
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/admin/help/video", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Upload failed");
      return;
    }
    setDraft((current) => ({ ...current, videoUrl: json.url || "" }));
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "settings", ...settings })
    });
    if (!res.ok) {
      toast.error("Could not save settings");
      return;
    }
    toast.success("Settings saved");
  }

  async function saveAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "announcement", ...note })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not save the announcement");
      return;
    }
    toast.success("Announcement saved");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Help</h1>
        <p className="text-sm text-muted-foreground">Articles, announcements, and the support number.</p>
      </div>
      <form onSubmit={saveSettings} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
        <label className="text-sm">
          Support WhatsApp number
          <Input value={settings.whatsappNumber} onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })} placeholder="91…" />
        </label>
        <label className="text-sm">
          Weekly report hour (IST, Monday)
          <Input type="number" min={0} max={23} value={settings.reportHourIst} onChange={(event) => setSettings({ ...settings, reportHourIst: Number(event.target.value) })} />
        </label>
        <label className="text-sm">
          Minute
          <Input type="number" min={0} max={59} value={settings.reportMinuteIst} onChange={(event) => setSettings({ ...settings, reportMinuteIst: Number(event.target.value) })} />
        </label>
        <label className="text-sm">
          Max reports per minute
          <Input type="number" min={1} max={60} value={settings.reportMaxPerMinute} onChange={(event) => setSettings({ ...settings, reportMaxPerMinute: Number(event.target.value) })} />
        </label>
        <Button type="submit" className="sm:col-span-2">Save support settings</Button>
      </form>
      <form onSubmit={saveArticle} className="grid gap-3 rounded-2xl border p-4">
        <h2 className="font-semibold">New article</h2>
        <Input placeholder="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        <Input placeholder="Slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          <select className="min-h-11 rounded-xl border px-3" value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
          <Input placeholder="Context key (tap, menu, store, print, billing, nfc)" value={draft.contextKey} onChange={(event) => setDraft({ ...draft, contextKey: event.target.value })} />
        </div>
        <label className="text-sm">
          Sort order
          <Input type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} />
        </label>
        <Textarea placeholder="Article" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
        <Input placeholder="YouTube or Vimeo URL" value={draft.videoUrl} onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })} />
        <input type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadVideo(file).catch(() => undefined); }} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />
          Published
        </label>
        <Button type="submit">Create article</Button>
      </form>
      <ul className="space-y-2">
        {articles.map((article) => (
          <li key={article.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
            <span>{article.language} · {article.category} · {article.title} {article.published ? "" : "(draft)"}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => toggleArticle(article)}>
              {article.published ? "Unpublish" : "Publish"}
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={saveAnnouncement} className="grid gap-3 rounded-2xl border p-4">
        <h2 className="font-semibold">Announcement</h2>
        <Input placeholder="Title" value={note.title} onChange={(event) => setNote({ ...note, title: event.target.value })} required />
        <Input placeholder="Title in Hindi" value={note.titleHi} onChange={(event) => setNote({ ...note, titleHi: event.target.value })} />
        <Textarea placeholder="Body" value={note.body} onChange={(event) => setNote({ ...note, body: event.target.value })} />
        <Textarea placeholder="Body in Hindi" value={note.bodyHi} onChange={(event) => setNote({ ...note, bodyHi: event.target.value })} />
        <Input placeholder="Link" value={note.link} onChange={(event) => setNote({ ...note, link: event.target.value })} />
        <select className="min-h-11 rounded-xl border px-3" value={note.audience} onChange={(event) => setNote({ ...note, audience: event.target.value })}>
          <option value="all">All owners</option>
          <option value="agents">Agents</option>
          <option value="module:REVIEWS">Reviews module</option>
          <option value="module:MENU">Menu module</option>
          <option value="module:STORE">Store module</option>
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="datetime-local" value={note.startsAt} onChange={(event) => setNote({ ...note, startsAt: event.target.value })} required />
          <Input type="datetime-local" value={note.endsAt} onChange={(event) => setNote({ ...note, endsAt: event.target.value })} required />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={note.published} onChange={(event) => setNote({ ...note, published: event.target.checked })} />
          Published
        </label>
        <Button type="submit">Create announcement</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {announcements.map((item) => (
          <li key={item.id} className="rounded-xl border p-3">
            {item.title} · {item.audience} · {item.published ? "live" : "draft"}
          </li>
        ))}
      </ul>
    </div>
  );
}

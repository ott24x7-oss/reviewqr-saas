"use client";

import * as React from "react";
import { videoEmbed } from "@/lib/help/video";

type Article = {
  id: string;
  title: string;
  body: string;
  category: string;
  videoUrl: string;
};

export function HelpCenter() {
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  const [query, setQuery] = React.useState("");
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [number, setNumber] = React.useState("");
  const [business, setBusiness] = React.useState("");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    if (stored === "hi" || stored === "en") setLang(stored);
    fetch("/api/v1/support-contact")
      .then((res) => res.json())
      .then((json) => setNumber(json.data?.whatsappNumber || ""))
      .catch(() => setNumber(""));
  }, []);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ lang, q: query });
      fetch(`/api/v1/help?${params}`)
        .then((res) => res.json())
        .then((json) => setArticles(json.data || []))
        .catch(() => setArticles([]));
    }, 150);
    return () => window.clearTimeout(handle);
  }, [lang, query]);

  const message = `Hi, I need help with ${business || "my business"} on Help.`;
  const whatsapp = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";

  return (
    <section className="space-y-3" data-testid="help-center">
      <div className="flex gap-2">
        <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => { setLang("en"); window.localStorage.setItem("rq-lang", "en"); }}>
          English
        </button>
        <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => { setLang("hi"); window.localStorage.setItem("rq-lang", "hi"); }}>
          हिंदी
        </button>
      </div>
      <label className="block text-sm">
        {lang === "hi" ? "लेख खोजें" : "Search articles"}
        <input
          className="mt-1 min-h-11 w-full rounded-xl border px-3"
          aria-label="Search help articles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {articles.length === 0 ? <p className="text-sm text-muted-foreground">{lang === "hi" ? "कोई लेख नहीं" : "No articles"}</p> : null}
      {articles.map((article) => {
        const video = videoEmbed(article.videoUrl);
        return (
          <article key={article.id} className="rounded-2xl border bg-white p-4" data-testid="help-article">
            <p className="text-xs text-muted-foreground">{article.category}</p>
            <h2 className="text-lg font-semibold">{article.title}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{article.body}</p>
            {video.kind === "file" ? <video className="mt-3 w-full" controls src={video.src} /> : null}
            {video.kind === "youtube" || video.kind === "vimeo" ? (
              <iframe className="mt-3 aspect-video w-full" src={video.src} title={article.title} allow="fullscreen" />
            ) : null}
          </article>
        );
      })}
      <label className="block text-xs">
        {lang === "hi" ? "व्यवसाय का नाम" : "Business name"}
        <input className="mt-1 min-h-11 w-full rounded-xl border px-3" value={business} onChange={(event) => setBusiness(event.target.value)} />
      </label>
      {whatsapp ? (
        <a className="inline-flex min-h-11 items-center font-medium underline" href={whatsapp} target="_blank" rel="noreferrer">
          WhatsApp support
        </a>
      ) : null}
    </section>
  );
}

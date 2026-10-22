"use client";

import * as React from "react";
import { videoEmbed } from "@/lib/help/video";

type Article = { id: string; title: string; body: string; videoUrl: string };

export function HelpLink({ context, page }: { context: string; page: string }) {
  const [open, setOpen] = React.useState(false);
  const [article, setArticle] = React.useState<Article | null>(null);
  const [number, setNumber] = React.useState("");
  const [business, setBusiness] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    const lang = window.localStorage.getItem("rq-lang") === "hi" ? "hi" : "en";
    fetch(`/api/v1/help?context=${encodeURIComponent(context)}&lang=${lang}`)
      .then((res) => res.json())
      .then((json) => setArticle((json.data && json.data[0]) || null))
      .catch(() => setArticle(null));
    fetch("/api/v1/support-contact")
      .then((res) => res.json())
      .then((json) => setNumber(json.data?.whatsappNumber || ""))
      .catch(() => setNumber(""));
  }, [open, context]);

  const video = videoEmbed(article?.videoUrl || "");
  const message = `Hi, I need help with ${business || "my business"} on ${page}.`;
  const whatsapp = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold"
        aria-label={`Help for ${page}`}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Help for ${page}`}
            data-testid="help-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{article?.title || page}</h2>
              <button type="button" className="min-h-11 px-3" onClick={() => setOpen(false)} aria-label="Close help">
                Close
              </button>
            </div>
            {article ? <p className="whitespace-pre-wrap text-sm">{article.body}</p> : <p className="text-sm">No article for this page yet.</p>}
            {video.kind === "file" ? <video className="mt-3 w-full" controls src={video.src} /> : null}
            {video.kind === "youtube" || video.kind === "vimeo" ? (
              <iframe className="mt-3 aspect-video w-full" src={video.src} title={article?.title || "Help video"} allow="fullscreen" />
            ) : null}
            {whatsapp ? (
              <a className="mt-3 inline-flex min-h-11 items-center font-medium underline" href={whatsapp} target="_blank" rel="noreferrer">
                WhatsApp support
              </a>
            ) : null}
            <label className="mt-3 block text-xs">
              Business name
              <input className="mt-1 min-h-11 w-full rounded-xl border px-3" value={business} onChange={(event) => setBusiness(event.target.value)} />
            </label>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import * as React from "react";

type Item = { id: string; title: string; titleHi: string; body: string; bodyHi: string; link: string };

export function AnnouncementBanner() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [lang, setLang] = React.useState<"en" | "hi">("en");

  function load() {
    fetch("/api/v1/announcements")
      .then((res) => res.json())
      .then((json) => setItems(json.data || []))
      .catch(() => setItems([]));
  }

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    if (stored === "hi" || stored === "en") setLang(stored);
    load();
  }, []);

  async function dismiss(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    await fetch("/api/v1/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border bg-amber-50 px-3 py-2" data-testid="announcement-banner">
          <div>
            <p className="text-sm font-semibold">{lang === "hi" && item.titleHi ? item.titleHi : item.title}</p>
            <p className="text-sm">{lang === "hi" && item.bodyHi ? item.bodyHi : item.body}</p>
            {item.link ? (
              <a className="text-sm underline" href={item.link}>
                {item.link}
              </a>
            ) : null}
          </div>
          <button type="button" className="min-h-11 px-3 text-sm" aria-label="Dismiss announcement" onClick={() => dismiss(item.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

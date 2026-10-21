"use client";

import * as React from "react";

type Hint = { id: string; label: string };

export function HintChips({
  slug,
  lang,
  onInsert
}: {
  slug: string;
  lang: "en" | "hi";
  onInsert: (text: string) => void;
}) {
  const [hints, setHints] = React.useState<Hint[]>([]);

  React.useEffect(() => {
    let dead = false;
    fetch(`/api/public/review-templates/pick?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (dead || !Array.isArray(json.hints)) return;
        setHints(
          json.hints.filter(
            (item: Hint) => item && typeof item.id === "string" && typeof item.label === "string" && item.label.trim()
          )
        );
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [slug]);

  if (!hints.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{lang === "hi" ? "अपने शब्दों में विषय जोड़ें" : "Add a topic to your own words"}</p>
      <div className="flex flex-wrap gap-2">
        {hints.map((hint) => (
          <button
            key={hint.id}
            type="button"
            className="min-h-11 max-w-full rounded-full border px-3 py-2 text-left text-sm"
            onClick={() => onInsert(hint.label.trim())}
          >
            {hint.label.trim()}
          </button>
        ))}
      </div>
    </div>
  );
}

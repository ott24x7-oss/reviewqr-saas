"use client";

import * as React from "react";
import Link from "next/link";

type Tip = { key: string; titleEn: string; titleHi: string; href: string };
type Weight = { labelEn: string; labelHi: string; weight: number; earned: number };
type Score = {
  ready: boolean;
  score: number | null;
  businessName?: string;
  weights: Record<string, number>;
  components: Array<{ key: string; labelEn: string; labelHi: string; weight: number; earned: number }>;
  tips: Tip[];
  checklist: Array<Tip & { done: boolean }>;
  history: Array<{ day: string; score: number }>;
};

const copy = {
  en: {
    title: "Growth score",
    starting: "Getting started",
    startingBody: "Your score appears after 7 days. These steps get the page ready.",
    week: "Do these 3 things this week",
    done: "Mark done",
    weights: "How this score is built",
    history: "Score history",
    empty: "No score yet"
  },
  hi: {
    title: "ग्रोथ स्कोर",
    starting: "शुरुआत",
    startingBody: "स्कोर 7 दिन बाद दिखेगा। ये कदम पेज तैयार करते हैं।",
    week: "इस हफ़्ते ये 3 काम करें",
    done: "हो गया",
    weights: "यह स्कोर कैसे बना",
    history: "स्कोर का इतिहास",
    empty: "अभी स्कोर नहीं"
  }
};

function groupedWeights(data: Score, lang: "en" | "hi") {
  const tap = data.components.filter((row) => row.labelEn === "Tap page");
  const rows: Weight[] = [];
  const seen = new Set<string>();
  for (const row of data.components) {
    if (row.labelEn === "Tap page") {
      if (seen.has("tap")) continue;
      seen.add("tap");
      rows.push({
        labelEn: "Tap page",
        labelHi: "टैप पेज",
        weight: tap.reduce((sum, item) => sum + item.weight, 0),
        earned: Math.round(tap.reduce((sum, item) => sum + item.earned, 0) * 10) / 10
      });
      continue;
    }
    rows.push({ labelEn: row.labelEn, labelHi: row.labelHi, weight: row.weight, earned: row.earned });
  }
  return rows.map((row) => ({ label: lang === "hi" ? row.labelHi : row.labelEn, weight: row.weight, earned: row.earned }));
}

export function GrowthCard({ businessId }: { businessId: string }) {
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  const [data, setData] = React.useState<Score | null>(null);
  const text = copy[lang];

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    if (stored === "hi" || stored === "en") setLang(stored);
  }, []);

  const load = React.useCallback(() => {
    fetch(`/api/v1/growth?businessId=${encodeURIComponent(businessId)}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || null))
      .catch(() => setData(null));
  }, [businessId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function markDone(tipKey: string) {
    await fetch("/api/v1/growth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId, tipKey })
    });
    load();
  }

  if (!data) return null;
  const history = data.history || [];
  const max = Math.max(100, ...history.map((row) => row.score));

  return (
    <section className="rounded-2xl border bg-white p-4" data-testid="growth-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{data.ready ? text.title : text.starting}</h2>
        {data.ready && data.score != null ? (
          <p className="text-3xl font-bold" data-testid="growth-score">
            {data.score}
          </p>
        ) : null}
      </div>
      {!data.ready ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{text.startingBody}</p>
          <ul className="mt-3 space-y-2">
            {data.checklist.map((item) => (
              <li key={item.key}>
                <Link className="inline-flex min-h-11 items-center text-sm font-medium underline" href={item.href}>
                  {item.done ? "✓ " : ""}
                  {lang === "hi" ? item.titleHi : item.titleEn}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium">{text.week}</p>
          <ul className="mt-2 space-y-2">
            {data.tips.map((tip) => (
              <li key={tip.key} className="flex flex-wrap items-center gap-2" data-testid="growth-tip">
                <Link className="inline-flex min-h-11 items-center text-sm font-medium underline" href={tip.href}>
                  {lang === "hi" ? tip.titleHi : tip.titleEn}
                </Link>
                <button type="button" className="min-h-11 rounded-full border px-3 text-xs" onClick={() => markDone(tip.key)}>
                  {text.done}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium">{text.weights}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {groupedWeights(data, lang).map((row) => (
              <li key={row.label} className="flex justify-between gap-3">
                <span>{row.label}</span>
                <span>
                  {row.earned}/{row.weight}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium">{text.history}</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{text.empty}</p>
          ) : (
            <svg viewBox={`0 0 ${Math.max(history.length, 2) * 16} 48`} className="mt-2 h-16 w-full" role="img" aria-label={text.history}>
              <polyline
                fill="none"
                stroke="#1C1B18"
                strokeWidth="2"
                points={history.map((row, index) => `${index * 16 + 4},${44 - (row.score / max) * 36}`).join(" ")}
              />
            </svg>
          )}
        </>
      )}
    </section>
  );
}

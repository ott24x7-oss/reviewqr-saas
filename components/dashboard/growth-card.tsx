"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";
import { InlineError, ProgressRing, Skeleton } from "@/components/app-ui/primitives";

type Tip = { key: string; titleEn: string; titleHi: string; href: string };
type Score = {
  ready: boolean;
  score: number | null;
  businessName?: string;
  tips: Tip[];
  history: Array<{ day: string; score: number }>;
};

export function GrowthCard({ businessId }: { businessId: string }) {
  const { language, text } = useAppLanguage();
  const [data, setData] = React.useState<Score | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/growth?businessId=${encodeURIComponent(businessId)}`);
      if (!response.ok) throw new Error("growth request failed");
      const json = await response.json();
      setData(json.data || null);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function markDone(tipKey: string) {
    try {
      const response = await fetch("/api/v1/growth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, tipKey })
      });
      if (!response.ok) throw new Error("growth update failed");
      const json = await response.json();
      setData(json.data || null);
    } catch {
      setFailed(true);
    }
  }

  if (loading) {
    return <section className="app-ui-panel space-y-4 p-5" aria-label={text("Loading growth score", "ग्रोथ स्कोर लोड हो रहा है")}>
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-12 w-full" />
    </section>;
  }
  if (failed || !data) {
    return <section className="app-ui-panel p-5" data-testid="growth-card">
      <InlineError title={text("Your growth tips could not load.", "ग्रोथ के सुझाव लोड नहीं हो सके।")} onRetry={() => void load()} />
    </section>;
  }

  const score = data.ready && typeof data.score === "number" ? data.score : null;
  const tips = data.tips.slice(0, 3);

  return (
    <section className="app-ui-panel p-5 sm:p-6" data-testid="growth-card">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0">
          <h2 className="font-semibold"><AppText en="Your growth" hi="आपकी ग्रोथ" /></h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {score === null
              ? text("The score starts after 7 days. Keep your page up to date meanwhile.", "7 दिन बाद स्कोर दिखेगा। तब तक अपना पेज अपडेट रखें।")
              : text("Small improvements help more customers find you.", "छोटे सुधारों से ज़्यादा ग्राहक आपको ढूँढ़ पाएँगे।")}
          </p>
        </div>
      </div>

      {score !== null ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-md bg-muted/50 p-4">
          <ProgressRing value={score} label={text("Growth score", "ग्रोथ स्कोर")} size={78} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium"><AppText en="This week" hi="इस हफ़्ते" /></p>
            <p className="mt-1 text-sm text-muted-foreground"><AppText en="Try these 3 simple actions" hi="ये 3 आसान काम करके देखें" /></p>
          </div>
        </div>
      ) : null}

      {tips.length ? (
        <ul className="mt-4 divide-y">
          {tips.map((tip, index) => (
            <li key={tip.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-medium text-muted-foreground">{index + 1}</span>
              <Link href={tip.href} className="app-ui-focus min-h-10 min-w-0 flex-1 py-2 text-sm font-medium hover:text-primary">
                {language === "hi" ? tip.titleHi : tip.titleEn}
              </Link>
              <button type="button" className="app-ui-focus inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10" onClick={() => void markDone(tip.key)}>
                <RefreshCw className="h-3.5 w-3.5" /><AppText en="Done" hi="हो गया" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Link href="/dashboard/insights" className="app-ui-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
          <AppText en="View your insights" hi="अपनी जानकारी देखें" /><ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

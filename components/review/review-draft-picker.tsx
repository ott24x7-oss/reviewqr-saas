"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

const STYLE_LABELS = {
  en: ["Short & punchy", "Detailed", "Casual", "Dish or service", "Atmosphere", "Balanced"],
  hi: ["छोटा और सीधा", "विस्तार से", "अनौपचारिक", "डिश या सेवा", "माहौल", "संतुलित"]
} as const;

export function ReviewDraftPicker({
  slug,
  rating,
  language,
  onLanguageChange,
  destination,
  onPrepareContinue,
  onContinue,
  onUnavailable
}: {
  slug: string;
  rating: number;
  language: "en" | "hi";
  onLanguageChange: (language: "en" | "hi") => void;
  destination: "Google" | "Trustpilot";
  onPrepareContinue: () => Window | null;
  onContinue: (reserved: Window | null) => void;
  onUnavailable: () => void;
}) {
  const [drafts, setDrafts] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [writingOwn, setWritingOwn] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [copying, setCopying] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");
  const unavailableRef = React.useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDrafts([]);
    setSelected(null);
    setWritingOwn(false);
    setValue("");
    async function load() {
      try {
        const response = await fetch("/api/public/ai/review-drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, rating, language })
        });
        const json = await response.json().catch(() => ({}));
        const generated = Array.isArray(json.drafts)
          ? json.drafts.filter((draft: unknown) => typeof draft === "string" && draft.trim())
          : [];
        if (cancelled) return;
        if (!response.ok || generated.length < 5) {
          unavailableRef.current();
          return;
        }
        setDrafts(generated.slice(0, 6));
        setLoading(false);
      } catch {
        if (!cancelled) unavailableRef.current();
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, rating, language]);

  async function copyAndContinue() {
    const text = value.trim();
    if (!text || copying) return;
    const reserved = onPrepareContinue();
    setCopying(true);
    setCopyError("");
    try {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.getElementById("review-ai-draft-text") as HTMLTextAreaElement | null;
        textarea?.focus();
        textarea?.select();
        if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
      }
      onContinue(reserved);
    } catch {
      reserved?.close();
      setCopyError(language === "hi" ? "कॉपी नहीं हो सका। टेक्स्ट चुनकर कॉपी करें।" : "Could not copy. Select the text and copy it.");
      setCopying(false);
    }
  }

  const hi = language === "hi";
  const destinationLabel = `${hi ? "कॉपी करें और" : "Copy & continue to"} ${destination}`;

  if (loading) {
    return (
      <section className="review-ai-draft-picker" aria-label={hi ? "AI रिव्यू सुझाव लोड हो रहे हैं" : "AI review suggestions loading"}>
        <div className="review-ai-draft-heading">
          <Sparkles aria-hidden="true" />
          <div>
            <h2>{hi ? "आपके रिव्यू के लिए कुछ शुरुआत" : "A few ways to start your review"}</h2>
            <p>{hi ? "आपके अनुभव के आधार पर सुझाव तैयार हो रहे हैं…" : "Preparing suggestions from your experience…"}</p>
          </div>
        </div>
        <div className="review-ai-skeleton" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((item) => <span key={item} />)}
        </div>
        <span className="sr-only" role="status">{hi ? "लोड हो रहा है" : "Loading"}</span>
      </section>
    );
  }

  return (
    <section className="review-ai-draft-picker" aria-label={hi ? "रिव्यू सुझाव" : "Review suggestions"}>
      <div className="review-ai-draft-heading">
        <Sparkles aria-hidden="true" />
        <div>
          <h2>{hi ? "एक शुरुआत चुनें" : "Choose a starting point"}</h2>
          <p>
            {hi
              ? "इसे अपने अनुभव के अनुसार बदलें। वही रखें जो आपके लिए सच है।"
              : "Edit it to match your visit. Keep only what’s true for you."}
          </p>
        </div>
      </div>

      <div className="review-ai-languages" role="group" aria-label={hi ? "भाषा" : "Language"}>
        <button type="button" aria-pressed={language === "en"} onClick={() => onLanguageChange("en")}>EN</button>
        <button type="button" lang="hi" aria-pressed={language === "hi"} onClick={() => onLanguageChange("hi")}>हिंदी</button>
      </div>

      <div className="review-ai-draft-options" role="group" aria-label={hi ? "रिव्यू ड्राफ्ट चुनें" : "Choose a review draft"}>
        {drafts.map((draft, index) => (
          <button
            key={`${index}-${draft.slice(0, 20)}`}
            type="button"
            aria-pressed={selected === index}
            className="review-ai-draft-option"
            onClick={() => {
              setSelected(index);
              setWritingOwn(false);
              setValue(draft);
            }}
          >
            <span className="review-ai-draft-style">{STYLE_LABELS[language][index]}</span>
            <span>{draft}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="review-ai-write-own"
        aria-pressed={writingOwn}
        onClick={() => {
          setWritingOwn(true);
          setSelected(null);
          setValue("");
        }}
      >
        {hi ? "मैं अपना लिखूँगा/लिखूँगी" : "Write my own instead"}
      </button>

      {selected !== null || writingOwn ? (
        <div className="review-ai-draft-editor">
          <label htmlFor="review-ai-draft-text">{hi ? "अपना रिव्यू संपादित करें" : "Edit your review"}</label>
          <textarea
            id="review-ai-draft-text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={hi ? "अपना अनुभव लिखें…" : "Write about your experience…"}
          />
          {copyError ? <p className="review-ai-copy-error" role="alert">{copyError}</p> : null}
          <button type="button" className="review-ai-continue" disabled={!value.trim() || copying} onClick={copyAndContinue}>
            {copying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {destinationLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { draftWordCount } from "@/lib/review-policy";

/**
 * Suggests a cleanup of words the customer already wrote.
 * The suggestion stays editable and is never posted.
 */
export function PolishDraft({
  slug,
  text,
  lang
}: {
  slug: string;
  text: string;
  lang: "en" | "hi";
}) {
  const [suggestion, setSuggestion] = React.useState("");
  const [polishing, setPolishing] = React.useState(false);
  const hi = lang === "hi";
  const ready = draftWordCount(text) >= 3;

  async function polish() {
    if (!ready || polishing) return;
    setPolishing(true);
    try {
      const res = await fetch("/api/public/ai/polish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, text })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.suggestion) {
        toast.message(
          hi
            ? "अपने शब्द रखें। सफाई अभी उपलब्ध नहीं है।"
            : "Keep your own words. A cleanup isn't available right now."
        );
        return;
      }
      setSuggestion(String(json.suggestion));
    } catch {
      toast.message(
        hi
          ? "अपने शब्द रखें। सफाई अभी उपलब्ध नहीं है।"
          : "Keep your own words. A cleanup isn't available right now."
      );
    } finally {
      setPolishing(false);
    }
  }

  async function copySuggestion() {
    const value = suggestion.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(hi ? "कॉपी हो गया। आप इसे चिपका सकते हैं।" : "Copied. You can paste it yourself.");
    } catch {
      toast.message(hi ? "टेक्स्ट चुनकर कॉपी करें।" : "Select the text and copy it.");
    }
  }

  return (
    <div className="space-y-2" lang={hi ? "hi" : "en"}>
      <button
        type="button"
        className="min-h-11 w-full rounded-full border px-4 text-sm font-semibold disabled:opacity-50"
        disabled={!ready || polishing}
        onClick={polish}
      >
        {polishing
          ? hi
            ? "साफ हो रहा है…"
            : "Cleaning up…"
          : hi
            ? "मेरे शब्दों को साफ करें"
            : "Clean up my text"}
      </button>
      <p className="text-xs leading-relaxed text-slate-600">
        {ready
          ? hi
            ? "यह सिर्फ सुझाव है। इसे बदलें, फिर खुद चिपकाएँ। कुछ भी अपने आप पोस्ट नहीं होता।"
            : "This is only a suggestion. Edit it, then paste it yourself. Nothing is posted for you."
          : hi
            ? "सफाई के लिए कम से कम तीन शब्द लिखें।"
            : "Write at least three words before a cleanup."}
      </p>
      {suggestion ? (
        <div className="space-y-2">
          <label htmlFor="polish-suggestion" className="text-sm font-medium">
            {hi ? "सुझाए गए शब्द" : "Suggested wording"}
          </label>
          <textarea
            id="polish-suggestion"
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            maxLength={2000}
            className="min-h-[110px] w-full rounded-2xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="min-h-11 rounded-full border px-4 text-sm font-semibold"
            onClick={copySuggestion}
          >
            {hi ? "सुझाव कॉपी करें" : "Copy suggestion"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

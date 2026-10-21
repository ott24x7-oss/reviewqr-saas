"use client";

export function NpsPicker({
  value,
  onChange,
  lang
}: {
  value: number | null;
  onChange: (score: number | null) => void;
  lang: "en" | "hi";
}) {
  const hi = lang === "hi";
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {hi ? "आप हमें कितना सुझाएँगे? वैकल्पिक।" : "How likely are you to recommend us? Optional."}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            className={`min-h-11 min-w-11 rounded-full border text-sm font-semibold ${
              value === score ? "bg-slate-900 text-white" : ""
            }`}
            onClick={() => onChange(value === score ? null : score)}
          >
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

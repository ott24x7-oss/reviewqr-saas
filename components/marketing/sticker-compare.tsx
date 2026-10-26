"use client";

import { Check, X } from "lucide-react";
import { pick, useLandingLang } from "@/components/marketing/landing-v2/lang";
import type { StickerRow } from "@/lib/plans/pricing-copy";

export function StickerTable({ rows }: { rows: StickerRow[] }) {
  const { lang } = useLandingLang();
  return (
    <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl bg-white/90 ring-1 ring-white">
      <div className="grid grid-cols-[1fr_72px_88px] items-center border-b border-slate-100 px-4 py-3 text-xs font-bold text-ink sm:grid-cols-[1fr_120px_120px] sm:text-sm">
        <span>{pick(lang, "Feature", "फ़ीचर")}</span>
        <span className="text-center text-muted-ink">{pick(lang, "QR sticker", "QR स्टिकर")}</span>
        <span className="text-center text-primary-800">QR24x7</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.labelEn}
          className="grid grid-cols-[1fr_72px_88px] items-center border-b border-slate-100 px-4 py-3 last:border-0 sm:grid-cols-[1fr_120px_120px]"
        >
          <span className="text-sm text-ink/85">{pick(lang, row.labelEn, row.labelHi)}</span>
          <span className="flex justify-center">
            {row.sticker ? <Check className="h-5 w-5 text-slate-400" /> : <X className="h-5 w-5 text-rose-400" />}
          </span>
          <span className="flex justify-center">
            {row.qr24x7 ? <Check className="h-5 w-5 text-primary-600" /> : <X className="h-5 w-5 text-rose-400" />}
          </span>
        </div>
      ))}
    </div>
  );
}

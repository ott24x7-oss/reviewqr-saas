"use client";

import * as React from "react";
import { shopCopy, type ShopLang } from "@/lib/shop/i18n";

export function useShopLang() {
  const [lang, setLang] = React.useState<ShopLang>("en");
  React.useEffect(() => {
    const saved = window.localStorage.getItem("reviewqr-shop-lang");
    if (saved === "hi" || saved === "en") setLang(saved);
  }, []);
  function choose(next: ShopLang) {
    setLang(next);
    window.localStorage.setItem("reviewqr-shop-lang", next);
  }
  return { lang, choose, copy: shopCopy(lang) };
}

export function ShopLangToggle({ lang, choose }: { lang: ShopLang; choose: (lang: ShopLang) => void }) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
      <button type="button" className={`rounded-full px-3 py-1 text-sm ${lang === "en" ? "bg-ink text-white" : "text-ink"}`} onClick={() => choose("en")}>
        English
      </button>
      <button type="button" className={`rounded-full px-3 py-1 text-sm ${lang === "hi" ? "bg-ink text-white" : "text-ink"}`} onClick={() => choose("hi")}>
        हिंदी
      </button>
    </div>
  );
}

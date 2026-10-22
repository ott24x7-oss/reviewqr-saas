"use client";

import * as React from "react";

export type LandingLang = "en" | "hi";

const LandingLangContext = React.createContext<{
  lang: LandingLang;
  setLang: (lang: LandingLang) => void;
}>({ lang: "en", setLang: () => {} });

export function LandingLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<LandingLang>("en");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("landing-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  const setLang = React.useCallback((next: LandingLang) => {
    setLangState(next);
    window.localStorage.setItem("landing-lang", next);
  }, []);

  return <LandingLangContext.Provider value={{ lang, setLang }}>{children}</LandingLangContext.Provider>;
}

export function useLandingLang() {
  return React.useContext(LandingLangContext);
}

export function pick(lang: LandingLang, en: string, hi: string) {
  return lang === "hi" ? hi : en;
}

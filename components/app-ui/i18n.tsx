"use client";

import * as React from "react";

export type AppLanguage = "en" | "hi";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  text: (english: string, hindi: string) => string;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setCurrentLanguage] = React.useState<AppLanguage>("en");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("rq-lang");
    if (saved === "hi" || saved === "en") setCurrentLanguage(saved);
  }, []);

  const setLanguage = React.useCallback((next: AppLanguage) => {
    window.localStorage.setItem("rq-lang", next);
    setCurrentLanguage(next);
  }, []);

  const text = React.useCallback(
    (english: string, hindi: string) => (language === "hi" ? hindi : english),
    [language]
  );

  const value = React.useMemo(() => ({ language, setLanguage, text }), [language, setLanguage, text]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) throw new Error("useAppLanguage must be used within AppLanguageProvider");
  return context;
}

export function AppText({
  en,
  hi,
  className
}: {
  en: string;
  hi: string;
  className?: string;
}) {
  const { text } = useAppLanguage();
  return <span className={className}>{text(en, hi)}</span>;
}

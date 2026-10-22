import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { copy, type Lang } from "./copy";

type I18nValue = {
  lang: Lang;
  t: (typeof copy)["en"];
  toggle: () => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: copy[lang],
      toggle: () => setLang((current) => (current === "en" ? "hi" : "en"))
    }),
    [lang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n outside provider");
  return value;
}

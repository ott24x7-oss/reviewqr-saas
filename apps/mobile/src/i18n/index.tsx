import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy, type Lang } from "./copy";

const LANG_KEY = "reviewqr.lang";

type I18nValue = {
  lang: Lang;
  t: (typeof copy)["en"];
  toggle: () => void;
  choose: (lang: Lang) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((value) => {
        if (value === "hi" || value === "en") setLang(value);
      })
      .catch(() => undefined);
  }, []);
  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: copy[lang],
      choose: (next: Lang) => {
        setLang(next);
        AsyncStorage.setItem(LANG_KEY, next).catch(() => undefined);
      },
      toggle: () => {
        setLang((current) => {
          const next = current === "en" ? "hi" : "en";
          AsyncStorage.setItem(LANG_KEY, next).catch(() => undefined);
          return next;
        });
      }
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

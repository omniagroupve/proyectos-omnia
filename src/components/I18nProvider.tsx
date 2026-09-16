"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, dict, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "lang";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };
const I18nContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, setLocale: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }

  return <I18nContext.Provider value={{ locale, setLocale }}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext);
}

export function useT() {
  const { locale } = useContext(I18nContext);
  return dict[locale];
}

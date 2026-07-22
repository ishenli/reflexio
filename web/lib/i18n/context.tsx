import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Locale, LocaleDict } from "./locales";
import { en } from "./en";
import { zh } from "./zh";

const STORAGE_KEY = "reflexio-locale";

const translations: Record<Locale, LocaleDict> = { en, zh };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: LocaleDict;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "zh") {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  // Skip hydration mismatch for the language toggle
  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: "en", setLocale, t: en }}>
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

// Template interpolation helper: replaces {key} with values from params
export function fmt(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export type { Locale };
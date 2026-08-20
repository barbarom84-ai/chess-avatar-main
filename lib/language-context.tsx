"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { loadLocale, type Language, type TranslationKey } from "./i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationKey;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const DEFAULT_LANG: Language = "en";

function readStoredLang(): Language {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const saved = localStorage.getItem("chess-avatar-lang");
  return saved === "fr" || saved === "en" ? saved : DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);
  const [t, setT] = useState<TranslationKey | null>(null);

  const applyLocale = useCallback(async (nextLang: Language) => {
    const bundle = await loadLocale(nextLang);
    setT(bundle);
    setLangState(nextLang);
  }, []);

  useEffect(() => {
    void applyLocale(readStoredLang());
  }, [applyLocale]);

  const setLang = (newLang: Language) => {
    localStorage.setItem("chess-avatar-lang", newLang);
    void applyLocale(newLang);
  };

  if (!t) {
    return (
      <div className="min-h-screen theme-gradient theme-text-primary" aria-busy="true" />
    );
  }

  const value: LanguageContextType = {
    lang,
    setLang,
    t,
    ready: true,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

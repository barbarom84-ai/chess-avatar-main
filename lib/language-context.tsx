"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Language } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.fr;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default and main language: English
  const [lang, setLangState] = useState<Language>("en");

  // Charger la langue depuis localStorage après le montage
  useEffect(() => {
    const savedLang = localStorage.getItem("chess-avatar-lang") as Language;
    if (savedLang === "fr" || savedLang === "en") {
      setLangState(savedLang);
    }
  }, []);

  // Sauvegarder la langue dans localStorage quand elle change
  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("chess-avatar-lang", newLang);
  };

  const value = {
    lang,
    setLang,
    t: translations[lang]
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

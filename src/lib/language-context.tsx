"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore, useCallback } from "react";
import { Language, translations, TranslationDictionary } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
}

const STORAGE_KEY = "choice-language";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
  };
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {}
  return "fr";
}

function getServerLanguage(): Language {
  return "fr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useSyncExternalStore(subscribe, getStoredLanguage, getServerLanguage);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "fr" : "en");
  }, [language, setLanguage]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: (translations[language] || translations.fr) as unknown as TranslationDictionary,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "fr",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations.fr as unknown as TranslationDictionary,
    };
  }
  return context;
}

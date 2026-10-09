"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.common.languageSelect}
      className="inline-flex items-center p-0.5 rounded-[var(--radius-badge)] bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold"
    >
      <span
        className="pl-1.5 pr-1 text-[var(--text-subtle)] flex items-center justify-center select-none"
        aria-hidden="true"
        title="Switch language / Changer de langue"
      >
        <Globe className="w-3.5 h-3.5" />
      </span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-label="English"
        aria-pressed={language === "en"}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer font-mono font-bold text-xs ${
          language === "en"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
            : "hover:text-[var(--text)] text-[var(--text-subtle)]"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("fr")}
        aria-label="Français"
        aria-pressed={language === "fr"}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer font-mono font-bold text-xs ${
          language === "fr"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
            : "hover:text-[var(--text)] text-[var(--text-subtle)]"
        }`}
      >
        FR
      </button>
    </div>
  );
};

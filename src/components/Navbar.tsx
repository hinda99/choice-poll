"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/lib/language-context";

export default function Navbar() {
  const { t } = useLanguage();

  return (
    <header className="h-16 sm:h-18 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 h-full flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-ring rounded-lg p-1"
          aria-label={t.navbar.brandHomeAria}
        >
          {/* Minimalist geometric logomark: two converging choice paths forming a crisp check */}
          <div className="w-8 h-8 rounded-[8px] bg-[var(--primary)] flex items-center justify-center text-[var(--on-primary)] shadow-xs transition-transform group-hover:scale-105">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-lg sm:text-xl tracking-tight text-[var(--text)] leading-tight">
              choice<span className="text-[var(--primary)]">.</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-[var(--text-muted)] leading-none">
              by hinda
            </span>
          </div>
        </Link>

        {/* Contextual Actions on Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

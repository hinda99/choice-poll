"use client";

import React from "react";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[var(--border)] py-6 text-xs text-[var(--text-muted)] bg-[var(--surface)] transition-colors">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span className="font-semibold text-[var(--text)]">choice.</span>{" "}
          <span>{t.footer.tagline.replace(/^choice\.\s*—\s*/, "— ")}</span>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-subtle)]">
          <span>{t.footer.creatorNotice}</span>
          <span>•</span>
          <span>{t.footer.sseSync}</span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else if (t === "light") {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("choice-theme") as Theme | null;
  return stored && ["light", "dark", "system"].includes(stored)
    ? stored
    : "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

export const ThemeToggle: React.FC = () => {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      applyTheme(getSnapshot());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSelect = (nextTheme: Theme) => {
    localStorage.setItem("choice-theme", nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("storage"));
  };

  if (!mounted) {
    return <div className="w-20 h-8" aria-hidden="true" />;
  }

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className="inline-flex items-center p-0.5 rounded-[var(--radius-badge)] bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-muted)]"
    >
      <button
        type="button"
        onClick={() => handleSelect("light")}
        aria-label="Light theme"
        aria-pressed={theme === "light"}
        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
          theme === "light"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
            : "hover:text-[var(--text)]"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleSelect("dark")}
        aria-label="Dark theme"
        aria-pressed={theme === "dark"}
        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
          theme === "dark"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
            : "hover:text-[var(--text)]"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleSelect("system")}
        aria-label="System theme"
        aria-pressed={theme === "system"}
        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
          theme === "system"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
            : "hover:text-[var(--text)]"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

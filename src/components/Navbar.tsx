import Link from "next/link";
import { Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Navbar() {
  return (
    <header className="h-16 sm:h-18 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 h-full flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-ring rounded-lg p-1"
          aria-label="Choice home"
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

          <span className="font-bold text-xl tracking-tight text-[var(--text)]">
            choice<span className="text-[var(--primary)]">.</span>
          </span>
        </Link>

        {/* Contextual Actions on Right */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-control)] bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] text-xs font-semibold shadow-xs transition-colors focus-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create poll</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

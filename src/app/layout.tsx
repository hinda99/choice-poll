import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "choice. — Account-free, real-time polling",
  description:
    "Fast, private online polling with live results, per-choice capacity, and owner response logs.",
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('choice-theme');
      var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} min-h-full flex flex-col bg-[var(--background)] text-[var(--text)] antialiased transition-colors`}
      >
        <Navbar />

        <ToastProvider>
          <main className="flex-1 max-w-[1120px] w-full mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10">
            {children}
          </main>
        </ToastProvider>

        <footer className="border-t border-[var(--border)] py-6 text-xs text-[var(--text-muted)] bg-[var(--surface)] transition-colors">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="font-semibold text-[var(--text)]">choice.</span>{" "}
              <span>— No accounts. Fast voting. Private public results.</span>
            </div>
            <div className="flex items-center gap-4 text-[var(--text-subtle)]">
              <span>Only poll creators see voter names</span>
              <span>•</span>
              <span>Real-time SSE sync</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

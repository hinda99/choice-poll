import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider } from "@/lib/language-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "choice. — Sondages rapides et anonymes en temps réel",
  description:
    "Sondages en ligne rapides et confidentiels avec résultats en direct, quotas par option et tableau de bord propriétaire.",
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('choice-theme') || 'light';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      var lang = localStorage.getItem('choice-language') || 'fr';
      if (lang === 'fr' || lang === 'en') {
        document.documentElement.lang = lang;
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
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} min-h-full flex flex-col bg-[var(--background)] text-[var(--text)] antialiased transition-colors`}
      >
        <LanguageProvider>
          <Navbar />

          <ToastProvider>
            <main className="flex-1 max-w-[1120px] w-full mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10">
              {children}
            </main>
          </ToastProvider>

          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}

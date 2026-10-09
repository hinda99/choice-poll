import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Choice — Instant Anonymous Online Polls",
  description:
    "Create and share instant anonymous polls with real-time results and first-come single-claim elimination mode.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased`}
      >
        <Navbar />
        <main className="flex-1 py-8 px-4 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Built with Next.js, Tailwind CSS & Real-Time Sync</p>
            <p className="flex items-center gap-1">
              <span>Zero sign-up required • 100% Anonymous</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

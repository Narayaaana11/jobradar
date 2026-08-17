import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Radar, LayoutGrid, Cpu } from 'lucide-react';

export const metadata = {
  title: 'JobRadar — Autonomous Job Search Engine',
  description: 'AI-driven job classification, extraction, scoring, referral outreach & resume tailoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-black text-white antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-white via-zinc-200 to-zinc-500 p-[1px] flex items-center justify-center shadow-lg shadow-white/5">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                <Radar className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                JobRadar
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-medium">Autonomous Career Agent Platform</p>
            </div>
          </div>

          <nav className="flex items-center space-x-2 bg-zinc-900/60 p-1.5 rounded-full border border-zinc-800">
            <Link
              href="/"
              className="flex items-center space-x-1.5 text-xs font-semibold px-4 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Jobs Feed</span>
            </Link>
            <Link
              href="/queue"
              className="flex items-center space-x-1.5 text-xs font-semibold px-4 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Pipeline Health</span>
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Agent Online
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>

        <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 font-medium">
          JobRadar Agent System &copy; 2026 Narayana Thota — Built by IndentDev
        </footer>
      </body>
    </html>
  );
}

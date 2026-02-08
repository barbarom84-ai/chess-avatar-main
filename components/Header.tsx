"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Settings, History } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ChessboardSettingsModal from "./ChessboardSettingsModal";
import { useLanguage } from "@/lib/language-context";

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <header className="w-full border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-blue-950/50 to-slate-950 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo et Titre */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 glow-cyan transition-all duration-300 group-hover:scale-110">
                <Image
                  src="/knight-logo.png"
                  alt="Chess Avatar Logo"
                  width={48}
                  height={48}
                  className="object-contain w-auto h-auto drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold neon-cyan tracking-tight">
                  Chess Avatar
                </h1>
                <p className="text-xs text-cyan-400/70 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Chess Bot Builder
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/" 
                className="text-sm text-cyan-100/80 hover:text-cyan-400 transition-colors duration-200 hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]"
              >
                {t.header.createBot}
              </Link>
              <Link 
                href="/profile" 
                className="text-sm text-cyan-100/80 hover:text-cyan-400 transition-colors duration-200 hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]"
              >
                {t.header.profiles}
              </Link>
              <Link 
                href="/games" 
                className="text-sm text-cyan-100/80 hover:text-cyan-400 transition-colors duration-200 hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.5)] flex items-center gap-1"
              >
                <History className="h-3 w-3" />
                {t.header.games}
              </Link>
              <Link 
                href="/guide" 
                className="text-sm text-cyan-100/80 hover:text-cyan-400 transition-colors duration-200 hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]"
              >
                {t.header.guide}
              </Link>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                title={t.header.boardSettingsTitle}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <ChessboardSettingsModal 
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </>
  );
}

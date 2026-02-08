"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Globe, Sun, Moon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { useChessboardSettings, getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import ChessboardSettingsModal from "./ChessboardSettingsModal";

export default function Navigation() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useChessboardSettings();
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Charger l'utilisateur actuel
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Définir les pièces selon le thème (dark = pièces blanches, light = pièces noires)
  const pieceColor = theme === 'dark' ? 'w' : 'b';
  
  const navItems = [
    {
      href: "/",
      piece: "K", // Roi
      label: { fr: "Accueil", en: "Home" }
    },
    {
      href: "/analyze",
      piece: "Q", // Dame
      label: { fr: "Analyser", en: "Analyze" }
    },
    {
      href: "/play",
      piece: "N", // Cavalier
      label: { fr: "Jouer", en: "Play" }
    },
    {
      href: "/profile",
      piece: "B", // Fou
      label: { fr: "Profil", en: "Profile" }
    },
    {
      href: "/games",
      piece: "R", // Tour
      label: { fr: "Parties", en: "Games" }
    },
    {
      href: "/guide",
      piece: "P", // Pion
      label: { fr: "UCI creator guide", en: "UCI creator guide" }
    }
  ];

  return (
    <nav className="bg-slate-950/80 dark:bg-slate-950/80 light:bg-[oklch(0.97_0.012_85)]/95 backdrop-blur-sm border-b border-slate-800 dark:border-slate-800 light:border-[oklch(0.82_0.018_75)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-cyan-400 dark:text-cyan-400 light:text-[oklch(0.45_0.12_190)] hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-[oklch(0.40_0.14_190)] transition-colors">
            <Image src={getPieceImagePath(settings.pieceSet, 'b', 'N')} alt="Knight" width={28} height={28} className="inline-block w-7 h-7" unoptimized />
            Chess Avatar
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const pieceSrc = getPieceImagePath(settings.pieceSet, pieceColor, item.piece);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={isActive 
                      ? "bg-cyan-600 text-white" 
                      : "text-slate-300 hover:text-cyan-300 hover:bg-slate-800"
                    }
                  >
                    <Image src={pieceSrc} alt={item.piece} width={20} height={20} className="inline-block w-5 h-5" unoptimized />
                    <span className="ml-2">{item.label[lang]}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Theme, Language Selector + Connection Status */}
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {isSupabaseConfigured && user && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400/50 bg-green-400/10 hidden md:flex">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                {user.email?.split('@')[0]}
              </Badge>
            )}
            
            {/* Board Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-cyan-600"
              aria-label="Board settings"
              title={t.chessboardSettings?.title || "Board settings"}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-cyan-600"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {/* Language Buttons */}
            <Button
              variant={lang === "fr" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLang("fr")}
              className={lang === "fr" ? "bg-cyan-600 text-white" : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-cyan-600"}
            >
              <Globe className="mr-1 h-3 w-3" /> FR
            </Button>
            <Button
              variant={lang === "en" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLang("en")}
              className={lang === "en" ? "bg-cyan-600 text-white" : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-cyan-600"}
            >
              <Globe className="mr-1 h-3 w-3" /> EN
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const pieceSrc = getPieceImagePath(settings.pieceSet, pieceColor, item.piece);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={isActive 
                    ? "bg-cyan-600 text-white" 
                    : "text-slate-300 hover:text-cyan-300"
                  }
                >
                  <Image src={pieceSrc} alt={item.piece} width={20} height={20} className="inline-block w-5 h-5" unoptimized />
                  <span className="ml-1 text-xs">{item.label[lang]}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      <ChessboardSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </nav>
  );
}

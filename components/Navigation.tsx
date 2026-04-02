"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Globe, Sun, Moon, Palette, Crown, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { useChessboardSettings, getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import { useEffect, useState, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePremium } from "@/hooks/usePremium";
import ChessboardSettingsModal from "./ChessboardSettingsModal";
import AuthModal from "./AuthModal";

export default function Navigation() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useChessboardSettings();
  const [user, setUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isPremium } = usePremium();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
  };

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
      href: "/learn",
      piece: "Q",
      label: { fr: "Apprentissage", en: "Learn" }
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
              const isActive = pathname === item.href || (item.href === "/learn" && pathname.startsWith("/learn"));
              const pieceSrc = getPieceImagePath(settings.pieceSet, pieceColor, item.piece);
              const label = item.href === "/learn" ? t.header.learn : item.label[lang];
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
                    <span className="ml-2">{label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Theme, Language Selector + User Account */}
          <div className="flex items-center gap-2">
            {/* User Account */}
            {isSupabaseConfigured && (
              <div className="relative hidden md:block" ref={userMenuRef}>
                {user ? (
                  <>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer bg-green-400/10 border-green-400/50 text-green-400 hover:bg-green-400/20"
                    >
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      {user.email?.split('@')[0]}
                      {isPremium && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                        <div className="px-3 py-2 border-b border-slate-700">
                          <p className="text-xs text-slate-400">{user.email}</p>
                          {isPremium && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 mt-1">
                              <Crown className="h-3 w-3" /> Premium
                            </span>
                          )}
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          {lang === "fr" ? "Mon Profil" : "My Profile"}
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          {lang === "fr" ? "Déconnexion" : "Sign Out"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-300"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {lang === "fr" ? "Connexion" : "Sign In"}
                  </button>
                )}
              </div>
            )}

            {/* Échiquier (thème, pièces, sons) — distinct du profil bot sur /play */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-cyan-300 dark:hover:text-cyan-300 light:hover:text-cyan-600 gap-1"
              aria-label={t.chessboardSettings.toolbarTooltip}
              title={t.chessboardSettings.toolbarTooltip}
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline text-xs whitespace-nowrap">
                {t.chessboardSettings.toolbarLabelShort}
              </span>
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
        <div className="md:hidden flex items-center justify-between gap-2 pb-2">
          {isSupabaseConfigured && (
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/profile">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-slate-200 hover:text-cyan-300"
                    >
                      <User className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">{lang === "fr" ? "Profil" : "Profile"}</span>
                      {isPremium && <Crown className="h-3.5 w-3.5 text-amber-400 ml-1" />}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSignOut}
                    className="h-8 px-2 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">{lang === "fr" ? "Déconnexion" : "Sign Out"}</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAuthModal(true)}
                  className="h-8 px-3 border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">{lang === "fr" ? "Connexion" : "Sign In"}</span>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/learn" && pathname.startsWith("/learn"));
            const pieceSrc = getPieceImagePath(settings.pieceSet, pieceColor, item.piece);
            const label = item.href === "/learn" ? t.header.learn : item.label[lang];
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
                  <span className="ml-1 text-xs">{label}</span>
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

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </nav>
  );
}

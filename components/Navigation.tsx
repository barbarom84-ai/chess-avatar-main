"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Globe, Palette, Crown, LogIn, LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useChessboardSettings, getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import type { PieceSet } from "@/contexts/ChessboardSettingsContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePremium } from "@/hooks/usePremium";
import { translations, type Language } from "@/lib/translations";
import ChessboardSettingsModal from "./ChessboardSettingsModal";
import AuthModal from "./AuthModal";

type NavItemDef = {
  href: string;
  piece: string;
  label: { fr: string; en: string };
};

const NAV_PIECE_COLOR_DEFAULT = "w" as const;

const NAV_ITEMS: NavItemDef[] = [
  { href: "/", piece: "K", label: { fr: "Accueil", en: "Home" } },
  { href: "/analyze", piece: "Q", label: { fr: "Analyser", en: "Analyze" } },
  { href: "/play", piece: "N", label: { fr: "Jouer", en: "Play" } },
  { href: "/arena", piece: "R", label: { fr: "Arène", en: "Arena" } },
  { href: "/learn", piece: "Q", label: { fr: "Apprentissage", en: "Learn" } },
  { href: "/puzzles", piece: "P", label: { fr: "Puzzles", en: "Puzzles" } },
  { href: "/profile", piece: "B", label: { fr: "Profil", en: "Profile" } },
  { href: "/games", piece: "R", label: { fr: "Parties", en: "Games" } },
  { href: "/guide", piece: "P", label: { fr: "UCI creator guide", en: "UCI creator guide" } },
];

type Translations = (typeof translations)[Language];

function isNavItemActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href === "/learn" && pathname.startsWith("/learn")) ||
    (href === "/puzzles" && pathname.startsWith("/puzzles")) ||
    (href === "/arena" && pathname.startsWith("/arena"))
  );
}

function navItemLabel(
  item: NavItemDef,
  lang: Language,
  t: Translations
): string {
  if (item.href === "/learn") return t.header.learn;
  if (item.href === "/games") return t.header.games;
  if (item.href === "/puzzles") return t.header.puzzles;
  if (item.href === "/arena") return t.header.arena;
  return item.label[lang];
}

function NavItemLinks({
  items,
  pathname,
  pieceSet,
  lang,
  t,
  compact,
}: {
  items: NavItemDef[];
  pathname: string;
  pieceSet: PieceSet;
  lang: Language;
  t: Translations;
  compact: boolean;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        const navPieceColor =
          item.href === "/learn" ? "b" : NAV_PIECE_COLOR_DEFAULT;
        const pieceSrc = getPieceImagePath(pieceSet, navPieceColor, item.piece);
        const label = navItemLabel(item, lang, t);
        const inactiveClass = compact
          ? "text-slate-300 hover:text-cyan-300"
          : "text-slate-300 hover:text-cyan-300 hover:bg-slate-800";

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`${
                isActive ? "bg-cyan-600 text-white" : inactiveClass
              } whitespace-normal leading-tight text-center`}
            >
              <Image
                src={pieceSrc}
                alt={item.piece}
                width={20}
                height={20}
                className="inline-block w-5 h-5"
                unoptimized
              />
              <span className={compact ? "ml-1 text-xs" : "ml-2"}>
                {label}
              </span>
            </Button>
          </Link>
        );
      })}
    </>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { settings } = useChessboardSettings();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isPremium } = usePremium();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
  }, []);

  return (
    <nav className="bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between min-h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Image
              src={getPieceImagePath(settings.pieceSet, "b", "N")}
              alt="Knight"
              width={28}
              height={28}
              className="inline-block w-7 h-7"
              unoptimized
            />
            Chess Avatar
          </Link>

          <div className="hidden md:flex flex-wrap items-center gap-x-1 gap-y-1">
            <NavItemLinks
              items={NAV_ITEMS}
              pathname={pathname}
              pieceSet={settings.pieceSet}
              lang={lang}
              t={t}
              compact={false}
            />
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConfigured && (
              <div className="relative hidden md:block" ref={userMenuRef}>
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer bg-green-400/10 border-green-400/50 text-green-400 hover:bg-green-400/20"
                    >
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {user.email?.split("@")[0]}
                      {isPremium && (
                        <Crown className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 min-w-[12rem] max-w-[min(20rem,90vw)] w-max text-left bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                        <div className="px-3 py-2 border-b border-slate-700">
                          <p className="text-xs text-slate-400 break-words">{user.email}</p>
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
                          type="button"
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
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-300"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {lang === "fr" ? "Connexion" : "Sign In"}
                  </button>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-slate-400 hover:text-cyan-300 gap-1"
              aria-label={t.chessboardSettings.toolbarTooltip}
              title={t.chessboardSettings.toolbarTooltip}
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline text-xs whitespace-nowrap">
                {t.chessboardSettings.toolbarLabelShort}
              </span>
            </Button>

            <Button
              variant={lang === "fr" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLang("fr")}
              className={
                lang === "fr"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-cyan-300"
              }
            >
              <Globe className="mr-1 h-3 w-3" /> FR
            </Button>
            <Button
              variant={lang === "en" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLang("en")}
              className={
                lang === "en"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-cyan-300"
              }
            >
              <Globe className="mr-1 h-3 w-3" /> EN
            </Button>
          </div>
        </div>

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
                      <span className="text-xs">
                        {lang === "fr" ? "Profil" : "Profile"}
                      </span>
                      {isPremium && (
                        <Crown className="h-3.5 w-3.5 text-amber-400 ml-1" />
                      )}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSignOut}
                    className="h-8 px-2 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">
                      {lang === "fr" ? "Déconnexion" : "Sign Out"}
                    </span>
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
                  <span className="text-xs">
                    {lang === "fr" ? "Connexion" : "Sign In"}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          <NavItemLinks
            items={NAV_ITEMS}
            pathname={pathname}
            pieceSet={settings.pieceSet}
            lang={lang}
            t={t}
            compact
          />
        </div>
      </div>

      <ChessboardSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </nav>
  );
}

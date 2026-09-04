"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Globe,
  Palette,
  Crown,
  LogIn,
  LogOut,
  User,
  Bot,
  Activity,
  Settings,
  Settings2,
  Info,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePremium } from "@/hooks/usePremium";
import { useSuperUser } from "@/hooks/useSuperUser";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import NavDock from "@/components/navigation/NavDock";
import ChessboardSettingsModal from "./ChessboardSettingsModal";
import AuthModal from "./AuthModal";
import AboutDialog from "./AboutDialog";
import NotificationBell from "./NotificationBell";

export default function Navigation() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { settings, updateSettings } = useChessboardSettings();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { isPremium } = usePremium();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const { config: siteConfig } = useSiteConfig();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const opsLabel = "Ops";
  const siteLabel = lang === "fr" ? "Site" : "Site";

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (isSuperUser) return true;
    return !siteConfig.nav[item.href]?.hidden;
  });

  const navCommonProps = {
    items: visibleNavItems,
    pathname,
    pieceSet: settings.pieceSet,
    navIconTheme: settings.navIconTheme ?? "android",
    lang,
    t,
    navConfig: siteConfig.nav,
  };

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
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target as Node)
      ) {
        setShowSettingsMenu(false);
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
    <>
      <nav className="bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-[100]">
        <div className="max-w-[1920px] mx-auto px-3 md:px-4 overflow-visible">
          <div className="flex items-center justify-between min-h-16 gap-2">
            <Link
              href="/"
              aria-label={
                lang === "fr" ? "Accueil — Chess Avatar" : "Home — Chess Avatar"
              }
              className="flex items-center gap-2 text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Image
                src="/knight-logo.png"
                alt=""
                width={28}
                height={28}
                className="inline-block w-7 h-7"
                unoptimized
              />
              <span className="hidden sm:inline">Chess Avatar</span>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
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
                            {t.pages.profile.title}
                          </Link>
                          <Link
                            href="/avatars"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                          >
                            <Bot className="h-4 w-4" />
                            {t.pages.avatars.title}
                          </Link>
                          {isSuperUser && !superLoading && (
                            <>
                              <Link
                                href="/admin/ops"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-amber-300 hover:bg-slate-800 transition-colors"
                              >
                                <Activity className="h-4 w-4" />
                                {opsLabel}
                              </Link>
                              <Link
                                href="/admin/site"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-amber-300 hover:bg-slate-800 transition-colors"
                              >
                                <Settings2 className="h-4 w-4" />
                                {siteLabel}
                              </Link>
                            </>
                          )}
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

              <NotificationBell />

              <div className="relative" ref={settingsMenuRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettingsMenu((open) => !open)}
                  className="text-slate-400 hover:text-cyan-300"
                  aria-label={t.navigation.settings.menu}
                  title={t.navigation.settings.menu}
                  aria-expanded={showSettingsMenu}
                  aria-haspopup="menu"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                </Button>
                {showSettingsMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 text-left bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowBoardSettings(true);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Palette className="h-4 w-4" />
                      {t.navigation.settings.board}
                    </button>

                    <div className="px-3 py-2 border-t border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t.navigation.settings.language}
                      </p>
                      <div className="mt-1.5 flex gap-1">
                        <Button
                          type="button"
                          variant={lang === "fr" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setLang("fr")}
                          className={
                            lang === "fr"
                              ? "flex-1 bg-cyan-600 text-white"
                              : "flex-1 text-slate-400 hover:text-cyan-300"
                          }
                        >
                          <Globe className="mr-1 h-3 w-3" /> FR
                        </Button>
                        <Button
                          type="button"
                          variant={lang === "en" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setLang("en")}
                          className={
                            lang === "en"
                              ? "flex-1 bg-cyan-600 text-white"
                              : "flex-1 text-slate-400 hover:text-cyan-300"
                          }
                        >
                          <Globe className="mr-1 h-3 w-3" /> EN
                        </Button>
                      </div>
                    </div>

                    <div className="px-3 py-2 border-t border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t.navigation.settings.navIcons}
                      </p>
                      <div className="mt-1.5 flex gap-1">
                        <Button
                          type="button"
                          variant={settings.navIconTheme === "android" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => updateSettings({ navIconTheme: "android" })}
                          className={
                            settings.navIconTheme === "android"
                              ? "flex-1 bg-cyan-600 text-white"
                              : "flex-1 text-slate-400 hover:text-cyan-300"
                          }
                        >
                          {t.navigation.settings.navIconsAndroid}
                        </Button>
                        <Button
                          type="button"
                          variant={settings.navIconTheme === "pieces" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => updateSettings({ navIconTheme: "pieces" })}
                          className={
                            settings.navIconTheme === "pieces"
                              ? "flex-1 bg-cyan-600 text-white"
                              : "flex-1 text-slate-400 hover:text-cyan-300"
                          }
                        >
                          {t.navigation.settings.navIconsPieces}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">
                        {t.navigation.settings.navIconsHint}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowAbout(true);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors border-t border-slate-800"
                    >
                      <Info className="h-4 w-4" />
                      {t.navigation.about.menu}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isSupabaseConfigured && (
            <div className="md:hidden flex items-center justify-end gap-2 pb-2">
              {user ? (
                <>
                  <Link href="/profile">
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-200">
                      <User className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSignOut}
                    className="h-8 px-2 text-red-400"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAuthModal(true)}
                  className="h-8 px-3 border-slate-600 bg-slate-800"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">{lang === "fr" ? "Connexion" : "Sign In"}</span>
                </Button>
              )}
            </div>
          )}
        </div>

        <ChessboardSettingsModal
          open={showBoardSettings}
          onOpenChange={setShowBoardSettings}
        />

        <AboutDialog open={showAbout} onOpenChange={setShowAbout} />

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </nav>

      <NavDock {...navCommonProps} />
    </>
  );
}

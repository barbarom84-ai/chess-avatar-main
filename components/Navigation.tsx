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
  Settings2,
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
import { isNavItemActive } from "@/lib/nav-utils";
import NavItemLinks from "@/components/navigation/NavItemLinks";
import NavMegaMenu from "@/components/navigation/NavMegaMenu";
import NavDock from "@/components/navigation/NavDock";
import RadialNavMenu from "@/components/navigation/RadialNavMenu";
import { NavPieceIcon } from "@/components/navigation/NavShared";
import ChessboardSettingsModal from "./ChessboardSettingsModal";
import AuthModal from "./AuthModal";

function AdminNavLinks({
  pathname,
  lang,
  opsLabel,
  siteLabel,
  compact,
}: {
  pathname: string;
  lang: string;
  opsLabel: string;
  siteLabel: string;
  compact?: boolean;
}) {
  return (
    <>
      <Link href="/admin/ops">
        <Button
          variant={pathname.startsWith("/admin/ops") ? "default" : "ghost"}
          size="sm"
          className={
            pathname.startsWith("/admin/ops")
              ? "bg-amber-700 text-white hover:bg-amber-600"
              : "text-slate-300 hover:text-amber-300 hover:bg-slate-800"
          }
          title={
            lang === "fr" ? "Monitoring temps réel" : "Live operations monitoring"
          }
        >
          <Activity className="h-4 w-4" />
          <span className={compact ? "ml-1 text-xs" : "ml-2"}>{opsLabel}</span>
        </Button>
      </Link>
      <Link href="/admin/site">
        <Button
          variant={pathname.startsWith("/admin/site") ? "default" : "ghost"}
          size="sm"
          className={
            pathname.startsWith("/admin/site")
              ? "bg-amber-700 text-white hover:bg-amber-600"
              : "text-slate-300 hover:text-amber-300 hover:bg-slate-800"
          }
          title={lang === "fr" ? "Configuration du site" : "Site configuration"}
        >
          <Settings2 className="h-4 w-4" />
          <span className={compact ? "ml-1 text-xs" : "ml-2"}>{siteLabel}</span>
        </Button>
      </Link>
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
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const { isPremium } = usePremium();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const { config: siteConfig } = useSiteConfig();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const opsLabel = "Ops";
  const siteLabel = lang === "fr" ? "Site" : "Site";

  const navMode = siteConfig.navMode;
  const useClassicNav = navMode === "classic";
  const useMegaNav = navMode === "mega";
  const useDockNav = navMode === "dock";
  const useRadialNav = navMode === "radial";

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (isSuperUser) return true;
    return !siteConfig.nav[item.href]?.hidden;
  });

  const navCommonProps = {
    items: visibleNavItems,
    pathname,
    pieceSet: settings.pieceSet,
    lang,
    t,
    navConfig: siteConfig.nav,
  };

  const activeNavItem = visibleNavItems.find((item) =>
    isNavItemActive(pathname, item.href)
  );

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

  const renderLogo = () => {
    const logoContent = (
      <>
        <Image
          src="/knight-logo.png"
          alt=""
          width={28}
          height={28}
          className="inline-block w-7 h-7"
          unoptimized
        />
        <span>Chess Avatar</span>
        {useRadialNav && activeNavItem && (
          <span className="hidden md:inline-flex ml-1 opacity-80" aria-hidden>
            <NavPieceIcon item={activeNavItem} pieceSet={settings.pieceSet} size={18} />
          </span>
        )}
      </>
    );

    if (useRadialNav) {
      return (
        <button
          type="button"
          onClick={() => setShowRadialMenu((v) => !v)}
          aria-expanded={showRadialMenu}
          aria-haspopup="dialog"
          aria-label={t.navigation.radial.openMenu[lang === "fr" ? "fr" : "en"]}
          className="flex items-center gap-2 text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          {logoContent}
        </button>
      );
    }

    return (
      <Link
        href="/"
        aria-label={
          lang === "fr" ? "Accueil — Chess Avatar" : "Home — Chess Avatar"
        }
        className="flex items-center gap-2 text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {logoContent}
      </Link>
    );
  };

  const renderDesktopNav = () => {
    if (useDockNav || useRadialNav || useMegaNav) return null;

    return (
      <div className="hidden md:flex flex-wrap items-center gap-x-1 gap-y-1">
        <NavItemLinks {...navCommonProps} compact={false} />
        {isSuperUser && !superLoading && (
          <AdminNavLinks
            pathname={pathname}
            lang={lang}
            opsLabel={opsLabel}
            siteLabel={siteLabel}
          />
        )}
      </div>
    );
  };

  const showMobileClassicRow = useClassicNav;

  return (
    <>
      <nav className="bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between min-h-16 gap-2">
            {renderLogo()}

            {useMegaNav && (
              <div className="flex flex-1 justify-center min-w-0 px-2">
                <NavMegaMenu {...navCommonProps} />
              </div>
            )}

            {useMegaNav && isSuperUser && !superLoading && (
              <div className="hidden md:flex items-center gap-1">
                <AdminNavLinks
                  pathname={pathname}
                  lang={lang}
                  opsLabel={opsLabel}
                  siteLabel={siteLabel}
                />
              </div>
            )}

            {renderDesktopNav()}

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

          {(useClassicNav || useMegaNav) && (
            <div className="md:hidden flex items-center justify-between gap-2 pb-2">
              {isSupabaseConfigured && (
                <div className="flex items-center gap-2">
                  {user ? (
                    <>
                      <Link href="/avatars">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-slate-200 hover:text-cyan-300"
                          title={t.pages.avatars.nav}
                        >
                          <Bot className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href="/profile">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-slate-200 hover:text-cyan-300"
                        >
                          <User className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">{t.pages.profile.nav}</span>
                          {isPremium && (
                            <Crown className="h-3.5 w-3.5 text-amber-400 ml-1" />
                          )}
                        </Button>
                      </Link>
                      {isSuperUser && !superLoading && (
                        <Link href="/admin/ops">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-amber-300 hover:text-amber-200"
                            title={
                              lang === "fr"
                                ? "Monitoring temps réel"
                                : "Live operations monitoring"
                            }
                          >
                            <Activity className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">{opsLabel}</span>
                          </Button>
                        </Link>
                      )}
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
          )}

          {(useDockNav || useRadialNav) && isSupabaseConfigured && (
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

          {showMobileClassicRow && (
            <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
              <NavItemLinks {...navCommonProps} compact />
              {isSuperUser && !superLoading && (
                <AdminNavLinks
                  pathname={pathname}
                  lang={lang}
                  opsLabel={opsLabel}
                  siteLabel={siteLabel}
                  compact
                />
              )}
            </div>
          )}
        </div>

        <ChessboardSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
        />

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </nav>

      {useDockNav && <NavDock {...navCommonProps} />}

      {useRadialNav && (
        <>
          <RadialNavMenu
            {...navCommonProps}
            open={showRadialMenu}
            onOpenChange={setShowRadialMenu}
            anchor="header"
          />
          <button
            type="button"
            className="md:hidden fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-500/50 bg-slate-900 shadow-xl glow-cyan"
            onClick={() => setShowRadialMenu(true)}
            aria-label={t.navigation.radial.openMenu[lang === "fr" ? "fr" : "en"]}
          >
            <Image
              src="/knight-logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
              unoptimized
            />
          </button>
        </>
      )}
    </>
  );
}

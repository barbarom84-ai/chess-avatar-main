"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Pin, PinOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NAV_FAMILIES,
  groupNavItemsByFamily,
  type NavFamily,
  type NavItemDef,
} from "@/lib/nav-items";
import {
  isNavItemActive,
  navDockGroupLabel,
  navItemLabel,
} from "@/lib/nav-utils";
import { cn } from "@/lib/utils";
import NavMobileSheet from "./NavMobileSheet";
import { NavItemBadges, NavPieceIcon, type NavCommonProps } from "./NavShared";

const MOBILE_QUICK_HREFS = ["/play", "/online", "/learn", "/puzzles"] as const;

function DockLink({
  item,
  isActive,
  expanded,
  pieceSet,
  lang,
  t,
  navConfig,
  vertical,
}: {
  item: NavItemDef;
  isActive: boolean;
  expanded: boolean;
  pieceSet: NavCommonProps["pieceSet"];
  lang: NavCommonProps["lang"];
  t: NavCommonProps["t"];
  navConfig: NavCommonProps["navConfig"];
  vertical?: boolean;
}) {
  const label = navItemLabel(item, lang, t);
  const badge = navConfig[item.href]?.badge ?? "none";

  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={!expanded && vertical ? label : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
        vertical ? "flex-col py-2.5 min-w-[3rem]" : "w-full",
        isActive
          ? "bg-cyan-600/25 text-cyan-100 ring-1 ring-cyan-500/50 glow-cyan"
          : "text-slate-400 hover:bg-slate-800/80 hover:text-cyan-300"
      )}
    >
      <NavPieceIcon item={item} pieceSet={pieceSet} size={22} />
      {expanded && (
        <span className={cn("truncate", vertical ? "text-[10px] text-center leading-tight max-w-[4.5rem]" : "flex-1")}>
          {label}
          <NavItemBadges item={item} badge={badge} lang={lang} />
        </span>
      )}
    </Link>
  );

  if (expanded || vertical) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function NavDock(props: NavCommonProps) {
  const { items, pathname, pieceSet, lang, t, navConfig, onOpenAbout } = props;
  const grouped = groupNavItemsByFamily(items);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const expanded = pinned || hovered;
  const pinLabel = pinned
    ? t.navigation.dock.unpin[lang === "fr" ? "fr" : "en"]
    : t.navigation.dock.pin[lang === "fr" ? "fr" : "en"];

  const mobileQuick = MOBILE_QUICK_HREFS.map((href) =>
    items.find((item) => item.href === href)
  ).filter((item): item is NavItemDef => Boolean(item));

  const renderDesktopDock = () => (
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-16 z-40 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transition-[width] duration-200",
          expanded ? "w-52" : "w-14"
        )}
        style={{ height: "calc(100vh - 4rem)" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={t.navigation.dock.menuTitle[lang === "fr" ? "fr" : "en"]}
      >
        <div className="flex items-center justify-end border-b border-slate-800 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-500 hover:text-cyan-300"
            onClick={() => setPinned(!pinned)}
            aria-label={pinLabel}
            title={pinLabel}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2 space-y-4">
          {NAV_FAMILIES.map((family) => {
            const familyItems = grouped[family];
            if (familyItems.length === 0) return null;
            return (
              <div key={family}>
                {expanded && (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {navDockGroupLabel(family, lang, t)}
                  </p>
                )}
                {!expanded && family !== "play" && (
                  <div className="mx-auto my-2 h-px w-6 bg-slate-800" aria-hidden />
                )}
                <ul className="space-y-0.5">
                  {familyItems.map((item) => (
                    <li key={item.href}>
                      <DockLink
                        item={item}
                        isActive={isNavItemActive(pathname, item.href)}
                        expanded={expanded}
                        pieceSet={pieceSet}
                        lang={lang}
                        t={t}
                        navConfig={navConfig}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        {onOpenAbout && (
          <div className="border-t border-slate-800 p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-slate-400 hover:text-cyan-300",
                expanded ? "justify-start gap-2 px-2" : "justify-center px-0"
              )}
              onClick={onOpenAbout}
              aria-label={t.navigation.about.menu}
              title={t.navigation.about.menu}
            >
              <Info className="h-4 w-4 shrink-0" />
              {expanded && <span className="truncate text-sm">{t.navigation.about.menu}</span>}
            </Button>
          </div>
        )}
      </aside>
  );

  const renderMobileBar = () => (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-2 py-1.5 safe-area-pb"
      aria-label={t.navigation.dock.menuTitle[lang === "fr" ? "fr" : "en"]}
    >
      {mobileQuick.map((item) => (
        <DockLink
          key={item.href}
          item={item}
          isActive={isNavItemActive(pathname, item.href)}
          expanded={false}
          pieceSet={pieceSet}
          lang={lang}
          t={t}
          navConfig={navConfig}
          vertical
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-0.5 h-auto py-2 text-slate-400 hover:text-cyan-300"
        onClick={() => setMobileMoreOpen(true)}
        aria-haspopup="dialog"
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="text-[10px]">{t.navigation.dock.more[lang === "fr" ? "fr" : "en"]}</span>
      </Button>

      <NavMobileSheet
        open={mobileMoreOpen}
        onOpenChange={setMobileMoreOpen}
        title={t.navigation.dock.menuTitle[lang === "fr" ? "fr" : "en"]}
      >
        <div className="space-y-4">
          {NAV_FAMILIES.map((family) => {
            const familyItems = grouped[family];
            if (familyItems.length === 0) return null;
            return (
              <section key={family}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
                  {navDockGroupLabel(family, lang, t)}
                </h3>
                <ul className="space-y-1">
                  {familyItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMoreOpen(false)}
                        aria-current={isNavItemActive(pathname, item.href) ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5",
                          isNavItemActive(pathname, item.href)
                            ? "bg-cyan-600/20 text-cyan-100"
                            : "text-slate-300 hover:bg-slate-800"
                        )}
                      >
                        <NavPieceIcon item={item} pieceSet={pieceSet} />
                        <span className="text-sm">
                          {navItemLabel(item, lang, t)}
                          <NavItemBadges
                            item={item}
                            badge={navConfig[item.href]?.badge ?? "none"}
                            lang={lang}
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {onOpenAbout && (
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                onOpenAbout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-800"
            >
              <Info className="h-5 w-5 text-cyan-400" />
              <span className="text-sm">{t.navigation.about.menu}</span>
            </button>
          )}
        </div>
      </NavMobileSheet>
    </nav>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {renderDesktopDock()}
      {renderMobileBar()}
    </TooltipProvider>
  );
}

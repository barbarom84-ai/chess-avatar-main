"use client";

import Link from "next/link";
import type { NavFamily, NavItemDef } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import {
  isNavItemActive,
  navItemDescription,
  navItemLabel,
} from "@/lib/nav-utils";
import { NavItemBadges, NavPieceIcon, type NavCommonProps } from "./NavShared";

type PanelProps = NavCommonProps & {
  family: NavFamily;
  items: NavItemDef[];
  onNavigate?: () => void;
  variant?: "dropdown" | "sheet";
};

export default function NavMegaMenuPanel({
  family,
  items,
  pathname,
  pieceSet,
  lang,
  t,
  navConfig,
  onNavigate,
  variant = "dropdown",
}: PanelProps) {
  if (items.length === 0) return null;

  return (
    <div
      role="menu"
      aria-label={t.navigation.families[family].label[lang === "fr" ? "fr" : "en"]}
      className={cn(
        variant === "dropdown" &&
          "absolute left-0 top-full z-50 mt-2 min-w-[18rem] rounded-xl border border-cyan-500/30 bg-slate-900/98 p-2 shadow-xl glow-cyan backdrop-blur-md",
        variant === "sheet" && "space-y-1"
      )}
    >
      {variant === "dropdown" && (
        <div
          className="absolute -top-px left-6 h-3 w-px bg-cyan-500/60"
          aria-hidden
        />
      )}
      <ul className={cn("space-y-0.5", variant === "sheet" && "space-y-1")}>
        {items.map((item, index) => {
          const isActive = isNavItemActive(pathname, item.href);
          const label = navItemLabel(item, lang, t);
          const desc = navItemDescription(item, t);
          const badge = navConfig[item.href]?.badge ?? "none";

          return (
            <li key={item.href} className="relative">
              {variant === "dropdown" && index > 0 && (
                <div
                  className="pointer-events-none absolute -top-0.5 left-4 h-2 w-px bg-cyan-500/25"
                  aria-hidden
                />
              )}
              <Link
                href={item.href}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-cyan-600/20 text-cyan-100 ring-1 ring-cyan-500/40"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-cyan-200"
                )}
              >
                <NavPieceIcon item={item} pieceSet={pieceSet} size={22} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1 text-sm font-medium">
                    {label}
                    <NavItemBadges item={item} badge={badge} lang={lang} />
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 group-hover:text-slate-400">
                    {desc}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
